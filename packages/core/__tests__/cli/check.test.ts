import { stripIndent } from 'common-tags';
import stripAnsi from 'strip-ansi';
import Project from '../utils/project';

describe('CLI: single-pass typechecking', () => {
  let project!: Project;
  beforeEach(async () => {
    jest.setTimeout(20_000);
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('passes a valid project', async () => {
    let code = stripIndent`
      import { Component, hbs } from '@glint/environment-glimmerx';

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

    let checkResult = await project.check();

    expect(checkResult.exitCode).toBe(0);
    expect(checkResult.stdout).toEqual('');
    expect(checkResult.stderr).toEqual('');
  });

  test('reports diagnostics for a template syntax error', async () => {
    let code = stripIndent`
      import { Component, hbs } from '@glint/environment-glimmerx';

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

    let checkResult = await project.check({ reject: false });

    expect(checkResult.exitCode).toBe(1);
    expect(checkResult.stdout).toEqual('');
    expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
      "index.ts:11:24 - error TS0: Parse error on line 2:
      ...e to app v{{@version}.    The current t
      -----------------------^
      Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', 'SEP', got 'INVALID'

      11     Welcome to app v{{@version}.
                                ~~~~~~~
      "
    `);
  });

  test('reports diagnostics for an inline template type error', async () => {
    let code = stripIndent`
      import { Component, hbs } from '@glint/environment-glimmerx';

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

    let checkResult = await project.check({ reject: false });

    expect(checkResult.exitCode).toBe(1);
    expect(checkResult.stdout).toEqual('');
    expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
      "index.ts:12:32 - error TS2551: Property 'startupTimee' does not exist on type 'Application'. Did you mean 'startupTime'?

      12     The current time is {{this.startupTimee}}.
                                        ~~~~~~~~~~~~

        index.ts:8:11
          8   private startupTime = new Date().toISOString();
                      ~~~~~~~~~~~
          'startupTime' is declared here.
      "
    `);
  });

  test('reports diagnostics for a companion template type error', async () => {
    project.write('.glintrc', 'environment: ember-loose\n');

    let script = stripIndent`
      import { EmberComponent } from '@glint/environment-ember-loose';

      export type MyComponentArgs = {
        message: string;
      };

      export default class MyComponent extends EmberComponent<{ Args: MyComponentArgs }> {
        target = 'World!';
      }
    `;

    let template = stripIndent`
      {{@message}}, {{this.targett}}
    `;

    project.write('my-component.ts', script);
    project.write('my-component.hbs', template);

    let checkResult = await project.check({ reject: false });

    expect(checkResult.exitCode).toBe(1);
    expect(checkResult.stdout).toEqual('');
    expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
      "my-component.hbs:1:22 - error TS2551: Property 'targett' does not exist on type 'MyComponent'. Did you mean 'target'?

      1 {{@message}}, {{this.targett}}
                             ~~~~~~~

        my-component.ts:8:3
          8   target = 'World!';
              ~~~~~~
          'target' is declared here.
      "
    `);
  });

  test('honors .glintrc configuration', async () => {
    let code = stripIndent`
      import { Component, hbs } from '@glint/environment-glimmerx';

      export default class Application extends Component {
        public static template = hbs\`
          {{ oh look a syntax error
        \`;
      }
    `;

    project.write('index.ts', code);
    project.write('.glintrc', 'environment: glimmerx\nexclude: "index.ts"\n');

    let checkResult = await project.check();

    expect(checkResult.exitCode).toBe(0);
    expect(checkResult.stdout).toBe('');
    expect(checkResult.stderr).toBe('');
  });
});
