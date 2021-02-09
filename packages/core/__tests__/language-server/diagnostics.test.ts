import Project from '../utils/project';
import { stripIndent } from 'common-tags';

describe('Language Server: Diagnostics', () => {
  let project!: Project;

  beforeEach(async () => {
    jest.setTimeout(20_000);
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('reports diagnostics for an inline template type error', () => {
    let code = stripIndent`
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

    let server = project.startLanguageServer();
    let diagnostics = server.getDiagnostics(project.fileURI('index.ts'));

    expect(diagnostics.length).toEqual(1);
    expect(diagnostics[0].uri).toEqual(project.fileURI('index.ts'));
    expect(diagnostics[0].diagnostics).toMatchInlineSnapshot(`
      Array [
        Object {
          "message": "Property 'startupTimee' does not exist on type 'Application'. Did you mean 'startupTime'?",
          "range": Object {
            "end": Object {
              "character": 43,
              "line": 11,
            },
            "start": Object {
              "character": 31,
              "line": 11,
            },
          },
          "severity": 1,
          "source": "glint:ts(2551)",
          "tags": Array [],
        },
        Object {
          "message": "'startupTime' is declared but its value is never read.",
          "range": Object {
            "end": Object {
              "character": 21,
              "line": 7,
            },
            "start": Object {
              "character": 10,
              "line": 7,
            },
          },
          "severity": 2,
          "source": "glint:ts(6133)",
          "tags": Array [
            1,
          ],
        },
      ]
    `);

    server.openFile(project.fileURI('index.ts'), code);
    server.updateFile(project.fileURI('index.ts'), code.replace('startupTimee', 'startupTime'));

    expect(server.getDiagnostics(project.fileURI('index.ts'))).toEqual([
      {
        uri: project.fileURI('index.ts'),
        diagnostics: [],
      },
    ]);
  });

  test('reports diagnostics for a companion template type error', () => {
    let script = stripIndent`
      import Component from '@glimmer/component';

      interface ApplicationArgs {
        version: string;
      }

      export default class Application extends Component<ApplicationArgs> {
        private startupTime = new Date().toISOString();
      }
    `;

    let template = stripIndent`
      Welcome to app v{{@version}}.
      The current time is {{this.startupTimee}}.
    `;

    project.write('.glintrc', 'environment: ember-loose\n');
    project.write('index.ts', script);
    project.write('index.hbs', template);

    let server = project.startLanguageServer();
    let diagnostics = server.getDiagnostics(project.fileURI('index.ts'));

    expect(diagnostics.length).toEqual(2);
    expect(diagnostics[0].uri).toEqual(project.fileURI('index.ts'));
    expect(diagnostics[0].diagnostics).toMatchInlineSnapshot(`
      Array [
        Object {
          "message": "'startupTime' is declared but its value is never read.",
          "range": Object {
            "end": Object {
              "character": 21,
              "line": 7,
            },
            "start": Object {
              "character": 10,
              "line": 7,
            },
          },
          "severity": 2,
          "source": "glint:ts(6133)",
          "tags": Array [
            1,
          ],
        },
      ]
    `);
    expect(diagnostics[1].uri).toEqual(project.fileURI('index.hbs'));
    expect(diagnostics[1].diagnostics).toMatchInlineSnapshot(`
      Array [
        Object {
          "message": "Property 'startupTimee' does not exist on type 'Application'. Did you mean 'startupTime'?",
          "range": Object {
            "end": Object {
              "character": 69,
              "line": 0,
            },
            "start": Object {
              "character": 57,
              "line": 0,
            },
          },
          "severity": 1,
          "source": "glint:ts(2551)",
          "tags": Array [],
        },
      ]
    `);

    server.openFile(project.fileURI('index.hbs'), template);
    server.updateFile(
      project.fileURI('index.hbs'),
      template.replace('startupTimee', 'startupTime')
    );

    expect(server.getDiagnostics(project.fileURI('index.ts'))).toEqual([
      {
        uri: project.fileURI('index.ts'),
        diagnostics: [],
      },
      {
        uri: project.fileURI('index.hbs'),
        diagnostics: [],
      },
    ]);
  });
});
