import os from 'os';

import { stripIndent } from 'common-tags';
import stripAnsi from 'strip-ansi';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { BASE_TS_CONFIG, INPUT_SCRIPT, setupCompositeProject } from '../utils/composite-project';
import Project from '../utils/project';

const BUILD_WATCH_TSCONFIG = {
  ...BASE_TS_CONFIG,
  compilerOptions: {
    ...BASE_TS_CONFIG.compilerOptions,
    declaration: true,
  },
};

// -------------------------------------------------------------------------- //
//
// NOTE: For reasons that are not entirely clear, the composite project tests
// require the insertion of arbitrary additional wait time between launching the
// project and making changes, and between additional changes, for the output to
// be captured in our tests. Accordingly, in several places below, you will see
// invocations like:
//
//     await pauseForTSBuffering();
//
// This may be a result of IO buffering managed by the test runner, by TS trying
// to be smart about bundling up changes, or some combination of the two. For
// the moment, we are landing these as is, unless/until we get reports of actual
// problems in real-world code.
//
// Additionally, we set a different value for Windows, because Windows
// (especially on CI) is noticeably slower than Linux or macOS.
//
// -------------------------------------------------------------------------- //

const IS_WINDOWS = os.type() === 'Windows_NT';
const PAUSE_TIME = IS_WINDOWS ? 2_500 : 1_000;

/** Combine `setTimeout` and a `Promise` to defer further work for some time. */
const pauseForTSBuffering = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, PAUSE_TIME));

describe('CLI: watched build mode typechecking', () => {
  describe('simple projects using `--build --watch`', () => {
    let project!: Project;
    beforeEach(async () => {
      project = await Project.createExact(BUILD_WATCH_TSCONFIG);
    });

    afterEach(async () => {
      await project.destroy();
    });

    test('passes a valid basic project', async () => {
      let code = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';
        import { hbs } from 'ember-template-imports';
  
        type ApplicationArgs = {
          version: string;
        };
  
        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();
  
          public static template = hbs\`
            Welcome to app v{{@version}}.
            The current time is {{this.startupTime}}.
          \`;
        }
      `;

      project.write(INPUT_SCRIPT, code);

      let watch = project.buildWatch({ reject: true });
      let output = await watch.awaitOutput('Watching for file changes.');
      await watch.terminate();

      expect(output).toMatch('Found 0 errors.');
    });

    test('reports diagnostics for a template syntax error', async () => {
      let code = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';
        import { hbs } from 'ember-template-imports';
  
        type ApplicationArgs = {
          version: string;
        };
  
        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();
  
          public static template = hbs\`
            Welcome to app v{{@version}}.
            The current time is {{this.startupTime}}.
            <p>Unclosed tag.
          \`;
        }
      `;

      project.write(INPUT_SCRIPT, code);

      let watch = project.buildWatch({ reject: false });
      let output = await watch.awaitOutput('Watching for file changes.');

      await watch.terminate();

      let stripped = stripAnsi(output);
      let error = stripped.slice(
        stripped.indexOf('index.ts'),
        stripped.lastIndexOf(`~~~${os.EOL}`) + 3
      );

      expect(output).toMatch('Found 1 error.');
      expect(error.replace(/\r/g, '')).toMatchInlineSnapshot('""');
    });

    test('reports diagnostics for a template type error', async () => {
      let code = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';
        import { hbs } from 'ember-template-imports';
  
        type ApplicationArgs = {
          version: string;
        };

        const truncate = (length: number, s: string): string =>
          s.slice(0, length);
  
        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();
  
          public static template = hbs\`
            Welcome to app v{{@version}}.
            The current time is {{truncate this.startupTime 12}}.
          \`;
        }
      `;

      project.write(INPUT_SCRIPT, code);

      let watch = project.buildWatch();
      let output = await watch.awaitOutput('Watching for file changes.');

      await watch.terminate();

      let stripped = stripAnsi(output);
      let error = stripped.slice(
        stripped.indexOf('index.ts'),
        stripped.lastIndexOf(`~~~${os.EOL}`) + 3
      );

      expect(output).toMatch('Found 1 error.');
      expect(error.replace(/\r/g, '')).toMatchInlineSnapshot(`
        "index.ts:17:36 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

        17     The current time is {{truncate this.startupTime 12}}.
                                              ~~~~~~~~~~~~~~~~"
      `);
    });

    test('reports on errors introduced and cleared during the watch', async () => {
      let code = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';
        import { hbs } from 'ember-template-imports';
  
        type ApplicationArgs = {
          version: string;
        };
  
        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();
  
          public static template = hbs\`
            Welcome to app v{{@version}}.
            The current time is {{this.startupTime}}.
          \`;
        }
      `;

      project.write(INPUT_SCRIPT, code);

      let watch = project.buildWatch({ reject: true });

      let output = await watch.awaitOutput('Watching for file changes.');
      expect(output).toMatch('Found 0 errors.');

      await pauseForTSBuffering();

      project.write(INPUT_SCRIPT, code.replace('this.startupTime', 'this.startupTimee'));

      output = await watch.awaitOutput('Watching for file changes.');
      expect(output).toMatch('Found 1 error.');

      await pauseForTSBuffering();

      project.write(INPUT_SCRIPT, code);

      output = await watch.awaitOutput('Watching for file changes.');
      expect(output).toMatch('Found 0 errors.');

      await watch.terminate();
    });
  });

  describe('composite projects', () => {
    // The basic structure here is designed to give minimal coverage over all
    // interesting combinations of project invalidation:
    //
    // - main -> a invalidated itself
    // - main -> a invalidated via c invalidated
    // - main -> b invalidated
    // - a invalidated itself
    // - a -> c invalidated
    // - b invalidated
    // - c invalidated
    //
    // The `root` is the workspace root, while the others are packages nested
    // within the workspace. There are other possible designs, but this is the
    // most common and the one we teach.
    let projects!: {
      root: Project;
      main: Project;
      children: {
        a: Project;
        b: Project;
        c: Project;
      };
    };

    let mainCode = stripIndent`
      import Component from '@glimmer/component';
      import { hbs } from 'ember-template-imports';
      import A from '@glint-test/a';
      import B from '@glint-test/b';

      type ApplicationArgs = {
        version: string;
      };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        public static template = hbs\`
          Welcome to app v{{@version}}.
          The current time is {{this.startupTime}}.
          <A/>
          <B/>
        \`;
      }
    `;

    let aCode = stripIndent`
      import { hbs } from 'ember-template-imports';
      import C from '@glint-test/c';

      const A = hbs\`Hello! <C />\`;
      export default A;
    `;

    let bCode = stripIndent`
      import { hbs } from 'ember-template-imports';
      const B = hbs\`Ahoy!\`;
      export default B;
    `;

    let cCode = stripIndent`
      import { hbs } from 'ember-template-imports';

      const add = (a: number, b: number) => a + b;

      const C = hbs\`{{add 123 456}}\`;
      export default C;
    `;

    beforeEach(async () => {
      projects = await setupCompositeProject();

      projects.main.write(INPUT_SCRIPT, mainCode);
      projects.children.a.write(INPUT_SCRIPT, aCode);
      projects.children.b.write(INPUT_SCRIPT, bCode);
      projects.children.c.write(INPUT_SCRIPT, cCode);
    });

    afterEach(async () => {
      // Invariant: this will clean up properly as long as `destroy()` continues
      // to recursively remove all directories *and* all child projects are
      // rooted in the root project.
      await projects.root.destroy();
    });

    test('passes when all projects are valid', async () => {
      let watch = projects.root.buildWatch({ reject: true });

      let output = await watch.awaitOutput('Watching for file changes.');
      expect(output).toMatch('Found 0 errors.');

      await watch.terminate();
    });

    describe('reports on errors introduced and cleared during the watch', () => {
      describe('for template syntax errors', () => {
        test('in the root', async () => {
          let watch = projects.root.buildWatch({ reject: true });

          let output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await pauseForTSBuffering();

          projects.main.write(
            INPUT_SCRIPT,
            mainCode.replace('{{this.startupTime}}', '{{this.startupTime}')
          );

          output = await watch.awaitOutput('Parse error');
          let stripped = stripAnsi(output);
          let error = stripped.slice(
            stripped.indexOf('index.ts'),
            stripped.lastIndexOf(`~~~${os.EOL}`) + 3
          );
          expect(error).toMatchInlineSnapshot(`
            "index.ts:15:32 - error TS0: Parse error on line 3:
            ...s {{this.startupTime}.    <A/>    <B/>
            -----------------------^
            Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', 'SEP', got 'INVALID'

            15     The current time is {{this.startupTime}.
                                              ~~~~~~~~~~~"
          `);

          await pauseForTSBuffering();

          projects.main.write(INPUT_SCRIPT, mainCode);

          output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await watch.terminate();
        });

        test('in a project with references referenced directly by the root', async () => {
          let watch = projects.root.buildWatch({ reject: true });

          let output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await pauseForTSBuffering();

          projects.children.a.write(INPUT_SCRIPT, aCode.replace('<C />', '<C>'));

          output = await watch.awaitOutput('Unclosed element');
          let stripped = stripAnsi(output);
          let error = stripped.slice(
            stripped.indexOf('index.ts'),
            stripped.lastIndexOf(`;${os.EOL}`) + 1
          );
          expect(error).toMatchInlineSnapshot(`
            "index.ts:4:22 - error TS0: Unclosed element \`C\`: 

            |
            |  <C>
            |

            (error occurred in 'an unknown module' @ line 1 : column 7)

            4 const A = hbs\`Hello! <C>\`;"
          `);

          await pauseForTSBuffering();

          projects.children.a.write(INPUT_SCRIPT, aCode);

          output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await watch.terminate();
        });

        test('in a project transitively referenced by the root', async () => {
          let watch = projects.root.buildWatch({ reject: true });

          let output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await pauseForTSBuffering();

          projects.children.c.write(INPUT_SCRIPT, cCode.replace('456}}', '456}'));

          output = await watch.awaitOutput('Parse error');
          let stripped = stripAnsi(output);
          let error = stripped.slice(
            stripped.indexOf('index.ts'),
            stripped.lastIndexOf(`~~~${os.EOL}`) + 3
          );
          expect(error).toMatchInlineSnapshot(`
            "index.ts:5:25 - error TS0: Parse error on line 1:
            {{add 123 456}
            -------------^
            Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'

            5 const C = hbs\`{{add 123 456}\`;
                                      ~~~"
          `);

          await pauseForTSBuffering();

          projects.children.c.write(INPUT_SCRIPT, cCode);

          output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await watch.terminate();
        });
      });

      describe('for template type errors', () => {
        test('in the root', async () => {
          let watch = projects.root.buildWatch({ reject: true });

          let output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await pauseForTSBuffering();

          projects.main.write(INPUT_SCRIPT, mainCode.replace('<A/>', '<A @foo="bar" />'));

          output = await watch.awaitOutput('is not assignable');
          let stripped = stripAnsi(output);
          let error = stripped.slice(
            stripped.indexOf('index.ts'),
            stripped.lastIndexOf(`~~~${os.EOL}`) + 3
          );
          expect(error).toMatchInlineSnapshot(`
            "index.ts:16:8 - error TS2345: Argument of type '{ foo: string; }' is not assignable to parameter of type 'EmptyObject'.
              Object literal may only specify known properties, and 'foo' does not exist in type 'EmptyObject'.

            16     <A @foo=\\"bar\\" />
                      ~~~~~~~~~~"
          `);

          await pauseForTSBuffering();

          projects.main.write(INPUT_SCRIPT, mainCode);

          output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await watch.terminate();
        });

        test('in a project with references referenced directly by the root', async () => {
          let watch = projects.root.buildWatch({ reject: true });

          let output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await pauseForTSBuffering();

          projects.children.a.write(INPUT_SCRIPT, aCode.replace('<C />', '<C @foo="bar" />'));

          output = await watch.awaitOutput('is not assignable');
          let stripped = stripAnsi(output);
          let error = stripped.slice(
            stripped.indexOf('index.ts'),
            stripped.lastIndexOf(`~~~${os.EOL}`) + 3
          );
          expect(error).toMatchInlineSnapshot(`
            "index.ts:4:25 - error TS2345: Argument of type '{ foo: string; }' is not assignable to parameter of type 'EmptyObject'.
              Object literal may only specify known properties, and 'foo' does not exist in type 'EmptyObject'.

            4 const A = hbs\`Hello! <C @foo=\\"bar\\" />\`;
                                      ~~~~~~~~~~"
          `);

          await pauseForTSBuffering();

          projects.children.a.write(INPUT_SCRIPT, aCode);

          output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await watch.terminate();
        });

        test('in a project transitively referenced by the root', async () => {
          let watch = projects.root.buildWatch({ reject: true });

          let output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await pauseForTSBuffering();

          projects.children.c.write(INPUT_SCRIPT, cCode.replace('123', '"hello"'));

          output = await watch.awaitOutput('is not assignable');
          let stripped = stripAnsi(output);
          let error = stripped.slice(
            stripped.indexOf('index.ts'),
            stripped.lastIndexOf(`~~~${os.EOL}`) + 3
          );
          expect(error).toMatchInlineSnapshot(`
            "index.ts:5:21 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

            5 const C = hbs\`{{add \\"hello\\" 456}}\`;
                                  ~~~~~~~"
          `);

          await pauseForTSBuffering();

          projects.children.c.write(INPUT_SCRIPT, cCode);

          output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await watch.terminate();
        });
      });
    });
  });
});
