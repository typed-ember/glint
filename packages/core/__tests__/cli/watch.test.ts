import * as os from 'node:os';
import { stripIndent } from 'common-tags';
import stripAnsi = require('strip-ansi');
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { Project } from '@glint/test-utils';

describe('CLI: watched typechecking', () => {
  let project!: Project;
  beforeEach(async () => {
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('passes a valid project', async () => {
    let code = stripIndent`
      import Component, { hbs } from '@glimmerx/component';

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

    project.write('index.ts', code);

    let watch = project.watch({ reject: true });
    let output = await watch.awaitOutput('Watching for file changes.');

    await watch.terminate();

    expect(output).toMatch('Found 0 errors.');
  });

  test('reports diagnostics for a template syntax error', async () => {
    let code = stripIndent`
      import Component, { hbs } from '@glimmerx/component';

      type ApplicationArgs = {
        version: string;
      };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        public static template = hbs\`
          Welcome to app v{{@version}.
          The current time is {{this.startupTime}}.
        \`;
      }
    `;

    project.write('index.ts', code);

    let watch = project.watch();
    let output = await watch.awaitOutput('Watching for file changes.');

    await watch.terminate();

    let stripped = stripAnsi(output);
    let error = stripped.slice(
      stripped.indexOf('index.ts'),
      stripped.lastIndexOf(`~~~${os.EOL}`) + 3
    );

    expect(output).toMatch('Found 1 error.');
    expect(error.replace(/\r/g, '')).toMatchInlineSnapshot(`
      "index.ts:11:24 - error TS0: Parse error on line 2:
      ...e to app v{{@version}.    The current t
      -----------------------^
      Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', 'SEP', got 'INVALID'

      11     Welcome to app v{{@version}.
                                ~~~~~~~"
    `);
  });

  test('reports diagnostics for a template type error', async () => {
    let code = stripIndent`
      import Component, { hbs } from '@glimmerx/component';

      type ApplicationArgs = {
        version: string;
      };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        public static template = hbs\`
          Welcome to app v{{@version}}.
          The current time is {{this.startupTimee}}.
        \`;
      }
    `;

    project.write('index.ts', code);

    let watch = project.watch();
    let output = await watch.awaitOutput('Watching for file changes.');

    await watch.terminate();

    let stripped = stripAnsi(output);
    let error = stripped.slice(
      stripped.indexOf('index.ts'),
      stripped.lastIndexOf(`~~~${os.EOL}`) + 3
    );

    expect(output).toMatch('Found 1 error.');
    expect(error.replace(/\r/g, '')).toMatchInlineSnapshot(`
      "index.ts:12:32 - error TS2551: Property 'startupTimee' does not exist on type 'Application'. Did you mean 'startupTime'?

      12     The current time is {{this.startupTimee}}.
                                        ~~~~~~~~~~~~

        index.ts:8:11
          8   private startupTime = new Date().toISOString();
                      ~~~~~~~~~~~"
    `);
  });

  test('reports on errors introduced and cleared during the watch', async () => {
    let code = stripIndent`
      import Component, { hbs } from '@glimmerx/component';

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

    project.write('index.ts', code);

    let watch = project.watch({ reject: true });

    let output = await watch.awaitOutput('Watching for file changes.');
    expect(output).toMatch('Found 0 errors.');

    project.write('index.ts', code.replace('this.startupTime', 'this.startupTimee'));

    output = await watch.awaitOutput('Watching for file changes.');
    expect(output).toMatch('Found 1 error.');

    project.write('index.ts', code);

    output = await watch.awaitOutput('Watching for file changes.');
    expect(output).toMatch('Found 0 errors.');

    await watch.terminate();
  });

  test('reports on errors introduced and cleared in a companion template', async () => {
    project.setGlintConfig({ environment: 'ember-loose' });
    project.write('index.ts', 'import "@glint/environment-ember-loose/types";');

    let script = stripIndent`
      import Component from '@ember/component';

      export type MyComponentArgs = {
        message: string;
      };

      export default class MyComponent extends Component<{ Args: MyComponentArgs }> {
        target = 'World!';
      }
    `;

    let template = stripIndent`
      {{@message}}, {{this.target}}
    `;

    project.write('my-component.ts', script);

    let watch = project.watch({ reject: true });

    let output = await watch.awaitOutput('Watching for file changes.');
    expect(output).toMatch('Found 0 errors.');

    project.write('my-component.hbs', template.replace('target', 'tarrget'));

    output = await watch.awaitOutput('Watching for file changes.');
    expect(output).toMatch('Found 1 error.');

    project.write('my-component.hbs', template);

    output = await watch.awaitOutput('Watching for file changes.');
    expect(output).toMatch('Found 0 errors.');

    project.write('my-component.hbs', template.replace('@message', '@messagee'));

    output = await watch.awaitOutput('Watching for file changes.');
    expect(output).toMatch('Found 1 error.');

    project.remove('my-component.hbs');

    output = await watch.awaitOutput('Watching for file changes.');
    expect(output).toMatch('Found 0 errors.');

    await watch.terminate();
  });

  test('reports on errors introduced and cleared in a script with a .gts extension', async () => {
    project.setGlintConfig({ environment: 'ember-template-imports' });

    let code = stripIndent`
      export default class MyClass {
        private startupTime = new Date().toISOString();

        public render(): void {
          console.log(this.startupTime);
        }
      }
    `;

    project.write('index.gts', code);

    let watch = project.watch({ reject: true });
    let output = await watch.awaitOutput('Watching for file changes.');
    expect(output).toMatch('Found 0 errors.');

    project.write('index.gts', code.replace('this.startupTime', 'this.startupTimee'));

    output = await watch.awaitOutput('Watching for file changes.');
    expect(output).toMatch('Found 1 error.');

    project.write('index.gts', code);

    output = await watch.awaitOutput('Watching for file changes.');
    expect(output).toMatch('Found 0 errors.');

    await watch.terminate();
  });

  test('reports correct diagnostics given @glint-expect-error and @glint-ignore directives', async () => {
    project.setGlintConfig({ environment: 'ember-loose' });

    let script = stripIndent`
      import Component from '@ember/component';

      export default class MyComponent extends Component {
        // private target = 'world';
      }
    `;

    let template = stripIndent`
      {{! @glint-ignore }}
      {{@message}},

      {{! @glint-expect-error }}
      {{this.target}}
    `;

    project.write('my-component.ts', script);
    project.write('my-component.hbs', template);

    let watch = project.watch();

    let output = await watch.awaitOutput('Watching for file changes.');
    expect(output).toMatch('Found 0 errors.');

    project.write('my-component.ts', script.replace('// ', ''));

    output = await watch.awaitOutput('Watching for file changes.');
    expect(output).toMatch('Found 1 error.');

    project.write('my-component.ts', script);

    output = await watch.awaitOutput('Watching for file changes.');
    expect(output).toMatch('Found 0 errors.');

    await watch.terminate();
  });
});
