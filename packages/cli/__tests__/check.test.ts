import { stripIndent } from 'common-tags';
import stripAnsi from 'strip-ansi';
import Project from './utils/project';

describe('single-pass typechecking', () => {
  let project!: Project;
  beforeEach(async () => {
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('passes a valid project', async () => {
    let code = stripIndent`
      import '@glint/template/glimmerx';
      import Component, { hbs } from '@glimmerx/component';

      interface ApplicationArgs {
        version: string;
      }

      export default class Application extends Component<ApplicationArgs> {
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
      import '@glint/template/glimmerx';
      import Component, { hbs } from '@glimmerx/component';

      interface ApplicationArgs {
        version: string;
      }

      export default class Application extends Component<ApplicationArgs> {
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
      "index.ts:11:28 - error TS0: [glint] Parse error on line 2:
      ...e to app v{{@version}.    The current t
      -----------------------^
      Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', 'SEP', got 'INVALID'

      11   public static template = hbs\`
                                    ~~~
      "
    `);
  });

  test('reports diagnostics for a template type error', async () => {
    let code = stripIndent`
      import '@glint/template/glimmerx';
      import Component, { hbs } from '@glimmerx/component';

      interface ApplicationArgs {
        version: string;
      }

      export default class Application extends Component<ApplicationArgs> {
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
      "index.ts:13:32 - error TS2551: Property 'startupTimee' does not exist on type 'Application'. Did you mean 'startupTime'?

      13     The current time is {{this.startupTimee}}.
                                        ~~~~~~~~~~~~

        index.ts:9:11
          9   private startupTime = new Date().toISOString();
                      ~~~~~~~~~~~
          'startupTime' is declared here.
      "
    `);
  });
});
