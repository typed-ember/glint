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

    let server = project.startLanguageServer();
    let diagnostics = server.getDiagnostics(project.fileURI('index.ts'));

    expect(diagnostics).toMatchInlineSnapshot(`
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

    expect(server.getDiagnostics(project.fileURI('index.ts'))).toEqual([]);
  });

  test('reports diagnostics for a companion template type error', () => {
    let script = stripIndent`
      import { Component } from '@glint/environment-glimmerx';

      type ApplicationArgs = {
        version: string;
      };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
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
    let scriptDiagnostics = server.getDiagnostics(project.fileURI('index.ts'));
    let templateDiagnostics = server.getDiagnostics(project.fileURI('index.hbs'));

    expect(scriptDiagnostics).toMatchInlineSnapshot(`
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

    expect(templateDiagnostics).toMatchInlineSnapshot(`
      Array [
        Object {
          "message": "Property 'startupTimee' does not exist on type 'Application'. Did you mean 'startupTime'?",
          "range": Object {
            "end": Object {
              "character": 39,
              "line": 1,
            },
            "start": Object {
              "character": 27,
              "line": 1,
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

    expect(server.getDiagnostics(project.fileURI('index.ts'))).toEqual([]);
    expect(server.getDiagnostics(project.fileURI('index.hbs'))).toEqual([]);
  });
});
