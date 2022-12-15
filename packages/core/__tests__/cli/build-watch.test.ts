import * as os from 'node:os';

import { stripIndent } from 'common-tags';
import stripAnsi = require('strip-ansi');
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  Project,
  BASE_TS_CONFIG,
  INPUT_SFC,
  setupCompositeProject,
} from 'glint-monorepo-test-utils';

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

        type ApplicationArgs = {
          version: string;
        };

        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();

          <template>
            Welcome to app v{{@version}}.
            The current time is {{this.startupTime}}.
          </template>
        }
      `;

      project.write(INPUT_SFC, code);

      let watch = project.buildWatch({ reject: true });
      let output = await watch.awaitOutput('Watching for file changes.');
      await watch.terminate();

      expect(output).toMatch('Found 0 errors.');
    });

    test('reports diagnostics for a template syntax error', async () => {
      let code = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';

        type ApplicationArgs = {
          version: string;
        };

        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();

          <template>
            Welcome to app v{{@version}}.
            The current time is {{this.startupTime}}.
            <p>Unclosed tag.
          </template>
        }
      `;

      project.write(INPUT_SFC, code);

      let watch = project.buildWatch({ reject: false });
      let output = await watch.awaitOutput('Watching for file changes.');

      await watch.terminate();

      let stripped = stripAnsi(output);
      let error = stripped.slice(
        stripped.indexOf('index.gts'),
        stripped.lastIndexOf(`~~~${os.EOL}`) + 3
      );

      expect(output).toMatch('Found 1 error.');
      expect(error.replace(/\r/g, '')).toMatchInlineSnapshot('""');
    });

    test('reports diagnostics for a template type error', async () => {
      let code = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';

        type ApplicationArgs = {
          version: string;
        };

        const truncate = (length: number, s: string): string =>
          s.slice(0, length);

        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();

          <template>
            Welcome to app v{{@version}}.
            The current time is {{truncate this.startupTime 12}}.
          </template>
        }
      `;

      project.write(INPUT_SFC, code);

      let watch = project.buildWatch();
      let output = await watch.awaitOutput('Watching for file changes.');

      await watch.terminate();

      let stripped = stripAnsi(output);
      let error = stripped.slice(
        stripped.indexOf('index.gts'),
        stripped.lastIndexOf(`~~~${os.EOL}`) + 3
      );

      expect(output).toMatch('Found 1 error.');
      expect(error.replace(/\r/g, '')).toMatchInlineSnapshot(`
        "index.gts:16:36 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

        16     The current time is {{truncate this.startupTime 12}}.
                                              ~~~~~~~~~~~~~~~~"
      `);
    });

    test('reports on errors introduced and cleared during the watch', async () => {
      let code = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';

        type ApplicationArgs = {
          version: string;
        };

        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();

          <template>
            Welcome to app v{{@version}}.
            The current time is {{this.startupTime}}.
          </template>
        }
      `;

      project.write(INPUT_SFC, code);

      let watch = project.buildWatch({ reject: true });

      let output = await watch.awaitOutput('Watching for file changes.');
      expect(output).toMatch('Found 0 errors.');

      await pauseForTSBuffering();

      project.write(INPUT_SFC, code.replace('this.startupTime', 'this.startupTimee'));

      output = await watch.awaitOutput('Watching for file changes.');
      expect(output).toMatch('Found 1 error.');

      await pauseForTSBuffering();

      project.write(INPUT_SFC, code);

      output = await watch.awaitOutput('Watching for file changes.');
      expect(output).toMatch('Found 0 errors.');

      await watch.terminate();
    });
    test('reports on errors introduced after removing a glint-nocheck directive', async () => {
      let code = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';

        type ApplicationArgs = {
          version: string;
        };

        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();

          <template>
            {{! @glint-nocheck }}
            <DoesNotExistYet />
          </template>
        }
      `;

      project.write(INPUT_SFC, code);

      let watch = project.buildWatch({ reject: true });

      let output = await watch.awaitOutput('Watching for file changes.');
      expect(output).toMatch('Found 0 errors.');

      await pauseForTSBuffering();

      project.write(INPUT_SFC, code.replace('{{! @glint-nocheck }}', ''));

      output = await watch.awaitOutput('Watching for file changes.');
      expect(output).toMatch('Found 1 error.');

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
      import A from '@glint-test/a';
      import B from '@glint-test/b';

      type ApplicationArgs = {
        version: string;
      };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        <template>
          Welcome to app v{{@version}}.
          The current time is {{this.startupTime}}.
          <A/>
          <B/>
        </template>
      }
    `;

    let aCode = stripIndent`
      import C from '@glint-test/c';

      const A = <template>Hello! <C /></template>;
      export default A;
    `;

    let bCode = stripIndent`
      const B = <template>Ahoy!</template>;
      export default B;
    `;

    let cCode = stripIndent`

      const add = (a: number, b: number) => a + b;

      const C = <template>{{add 123 456}}</template>;
      export default C;
    `;

    beforeEach(async () => {
      projects = await setupCompositeProject();

      projects.main.write(INPUT_SFC, mainCode);
      projects.children.a.write(INPUT_SFC, aCode);
      projects.children.b.write(INPUT_SFC, bCode);
      projects.children.c.write(INPUT_SFC, cCode);
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
            INPUT_SFC,
            mainCode.replace('{{this.startupTime}}', '{{this.startupTime}')
          );

          output = await watch.awaitOutput('Parse error');
          let stripped = stripAnsi(output);
          let error = stripped.slice(
            stripped.indexOf('index.gts'),
            stripped.lastIndexOf(`~~~${os.EOL}`) + 3
          );
          expect(error).toMatchInlineSnapshot(`
            "index.gts:14:32 - error TS0: Parse error on line 3:
            ...s {{this.startupTime}.    <A/>    <B/>
            -----------------------^
            Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', 'SEP', got 'INVALID'

            14     The current time is {{this.startupTime}.
                                              ~~~~~~~~~~~"
          `);

          await pauseForTSBuffering();

          projects.main.write(INPUT_SFC, mainCode);

          output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await watch.terminate();
        });

        test('in a project with references referenced directly by the root', async () => {
          let watch = projects.root.buildWatch({ reject: true });

          let output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await pauseForTSBuffering();

          projects.children.a.write(INPUT_SFC, aCode.replace('<C />', '<C>'));

          output = await watch.awaitOutput('Watching for file changes.');
          let stripped = stripAnsi(output);
          let error = stripped.slice(
            stripped.indexOf('index.gts'),
            stripped.lastIndexOf(`;${os.EOL}`) + 1
          );
          expect(error).toMatchInlineSnapshot(`
            "index.gts:3:28 - error TS0: Unclosed element \`C\`: 

            |
            |  <C>
            |

            (error occurred in 'an unknown module' @ line 1 : column 7)

            3 const A = <template>Hello! <C></template>;"
          `);

          await pauseForTSBuffering();

          projects.children.a.write(INPUT_SFC, aCode);

          output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await watch.terminate();
        });

        test('in a project transitively referenced by the root', async () => {
          let watch = projects.root.buildWatch({ reject: true });

          let output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await pauseForTSBuffering();

          projects.children.c.write(INPUT_SFC, cCode.replace('456}}', '456}'));

          output = await watch.awaitOutput('Parse error');
          let stripped = stripAnsi(output);
          let error = stripped.slice(
            stripped.indexOf('index.gts'),
            stripped.lastIndexOf(`~~~${os.EOL}`) + 3
          );
          expect(error).toMatchInlineSnapshot(`
            "index.gts:3:31 - error TS0: Parse error on line 1:
            {{add 123 456}
            -------------^
            Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'

            3 const C = <template>{{add 123 456}</template>;
                                            ~~~"
          `);

          await pauseForTSBuffering();

          projects.children.c.write(INPUT_SFC, cCode);

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

          projects.main.write(INPUT_SFC, mainCode.replace('<A/>', '<A @foo="bar" />'));

          output = await watch.awaitOutput('Watching for file changes.');
          let stripped = stripAnsi(output);
          let error = stripped.slice(
            stripped.indexOf('index.gts'),
            stripped.lastIndexOf(`~~~${os.EOL}`) + 3
          );
          expect(error).toMatchInlineSnapshot(`
            "index.gts:15:5 - error TS2554: Expected 0 arguments, but got 1.

            15     <A @foo=\\"bar\\" />
                   ~~~~~~~~~~~~~~~~"
          `);

          await pauseForTSBuffering();

          projects.main.write(INPUT_SFC, mainCode);

          output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await watch.terminate();
        });

        test('in a project with references referenced directly by the root', async () => {
          let watch = projects.root.buildWatch({ reject: true });

          let output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await pauseForTSBuffering();

          projects.children.a.write(INPUT_SFC, aCode.replace('<C />', '<C @foo="bar" />'));

          output = await watch.awaitOutput('Watching for file changes.');
          let stripped = stripAnsi(output);
          let error = stripped.slice(
            stripped.indexOf('index.gts'),
            stripped.lastIndexOf(`~~~${os.EOL}`) + 3
          );
          expect(error).toMatchInlineSnapshot(`
            "index.gts:3:28 - error TS2554: Expected 0 arguments, but got 1.

            3 const A = <template>Hello! <C @foo=\\"bar\\" /></template>;
                                         ~~~~~~~~~~~~~~~~"
          `);

          await pauseForTSBuffering();

          projects.children.a.write(INPUT_SFC, aCode);

          output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await watch.terminate();
        });

        test('in a project transitively referenced by the root', async () => {
          let watch = projects.root.buildWatch({ reject: true });

          let output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await pauseForTSBuffering();

          projects.children.c.write(INPUT_SFC, cCode.replace('123', '"hello"'));

          output = await watch.awaitOutput('Watching for file changes.');
          let stripped = stripAnsi(output);
          let error = stripped.slice(
            stripped.indexOf('index.gts'),
            stripped.lastIndexOf(`~~~${os.EOL}`) + 3
          );
          expect(error).toMatchInlineSnapshot(`
            "index.gts:3:27 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

            3 const C = <template>{{add \\"hello\\" 456}}</template>;
                                        ~~~~~~~"
          `);

          await pauseForTSBuffering();

          projects.children.c.write(INPUT_SFC, cCode);

          output = await watch.awaitOutput('Watching for file changes.');
          expect(output).toMatch('Found 0 errors.');

          await watch.terminate();
        });
      });
    });
  });
});
