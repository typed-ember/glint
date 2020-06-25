import { stripIndent } from 'common-tags';
import stripAnsi from 'strip-ansi';
import Project from './utils/project';

describe('watched typechecking', () => {
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

    let watch = project.watch({ reject: true });
    let output = await watch.awaitOutput('Watching for file changes.');

    await watch.terminate();

    expect(output).toMatch('Found 0 errors.');
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

    let watch = project.watch();
    let output = await watch.awaitOutput('Watching for file changes.');

    await watch.terminate();

    let stripped = stripAnsi(output);
    let error = stripped.slice(stripped.indexOf('index.ts'), stripped.lastIndexOf('~~~\n') + 3);

    expect(output).toMatch('Found 1 error.');
    expect(error).toMatchInlineSnapshot(`
      "index.ts:11:28 - error TS0: [glint] Parse error on line 2:
      ...e to app v{{@version}.    The current t
      -----------------------^
      Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', 'SEP', got 'INVALID'

      11   public static template = hbs\`
                                    ~~~"
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

    let watch = project.watch();
    let output = await watch.awaitOutput('Watching for file changes.');

    await watch.terminate();

    let stripped = stripAnsi(output);
    let error = stripped.slice(stripped.indexOf('index.ts'), stripped.lastIndexOf(`~~~\n`) + 3);

    expect(output).toMatch('Found 1 error.');
    expect(error).toMatchInlineSnapshot(`
      "index.ts:13:32 - error TS2551: Property 'startupTimee' does not exist on type 'Application'. Did you mean 'startupTime'?

      13     The current time is {{this.startupTimee}}.
                                        ~~~~~~~~~~~~

        index.ts:9:11
          9   private startupTime = new Date().toISOString();
                      ~~~~~~~~~~~"
    `);
  });

  test('reports on errors introduced and cleared during the watch', async () => {
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
});
