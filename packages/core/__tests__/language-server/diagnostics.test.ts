import { Project } from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';

describe('Language Server: Diagnostics', () => {
  let project!: Project;

  beforeEach(async () => {
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  // skipping until we tackle two-file components
  describe.skip('external file changes', () => {
    const scriptContents = stripIndent`
      import templateOnly from '@ember/component/template-only';

      interface TemplateOnlySignature {
        Args: { foo: string };
      }

      export default templateOnly<TemplateOnlySignature>();
    `;

    beforeEach(() => {
      project.setGlintConfig({ environment: 'ember-loose' });
    });

    test('adding a backing module', async () => {
      project.write('component.hbs', '{{@foo}}');

      let server = await project.startLanguageServer();
      let diagnostics = server.getDiagnostics(project.fileURI('component.hbs'));

      expect(diagnostics).toMatchObject([
        {
          message: "Property 'foo' does not exist on type '{}'.",
          source: 'glint',
          code: 2339,
        },
      ]);

      project.write('component.ts', scriptContents);
      server.watchedFileDidChange(project.fileURI('component.ts'));

      diagnostics = server.getDiagnostics(project.fileURI('component.hbs'));

      expect(diagnostics).toEqual([]);

      let defs = server.getDefinition(project.fileURI('component.hbs'), { line: 0, character: 5 });

      expect(defs).toEqual([
        {
          uri: project.fileURI('component.ts'),
          range: {
            start: { line: 3, character: 10 },
            end: { line: 3, character: 13 },
          },
        },
      ]);
    });

    test('removing a backing module', async () => {
      project.write('component.hbs', '{{@foo}}');
      project.write('component.ts', scriptContents);

      let server = await project.startLanguageServer();
      let diagnostics = server.getDiagnostics(project.fileURI('component.hbs'));

      expect(diagnostics).toEqual([]);

      project.remove('component.ts');
      server.watchedFileWasRemoved(project.fileURI('component.ts'));

      diagnostics = server.getDiagnostics(project.fileURI('component.hbs'));

      expect(diagnostics).toMatchObject([
        {
          message: "Property 'foo' does not exist on type '{}'.",
          source: 'glint',
          code: 2339,
        },
      ]);
    });
  });

  test('reports diagnostics for an inline template type error', async () => {
    let code = stripIndent`
      // Here's a leading comment to make sure we handle trivia right
      import Component from '@glimmer/component';

      type ApplicationArgs = {
        version: string;
      };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        <template>
          Welcome to app <code>v{{@version}}</code>.
          The current time is {{this.startupTimee}}.
        </template>
      }
    `;

    project.write('index.gts', code);

    let server = await project.startLanguageServer();
    const gtsUri = project.filePath('index.gts');
    const { uri } = await server.openTextDocument(gtsUri, 'glimmer-ts');
    const diagnostics = await server.sendDocumentDiagnosticRequest(uri);

    expect(diagnostics.items.reverse()).toMatchInlineSnapshot(`
      [
        {
          "code": 6133,
          "data": {
            "documentUri": "volar-embedded-content://URI_ENCODED_PATH_TO/FILE",
            "isFormat": false,
            "original": {},
            "pluginIndex": 0,
            "uri": "file:///path/to/EPHEMERAL_TEST_PROJECT/index.gts",
            "version": 0,
          },
          "message": "'startupTime' is declared but its value is never read.",
          "range": {
            "end": {
              "character": 21,
              "line": 8,
            },
            "start": {
              "character": 10,
              "line": 8,
            },
          },
          "severity": 4,
          "source": "glint",
          "tags": [
            1,
          ],
        },
        {
          "code": 2551,
          "data": {
            "documentUri": "volar-embedded-content://URI_ENCODED_PATH_TO/FILE",
            "isFormat": false,
            "original": {},
            "pluginIndex": 0,
            "uri": "file:///path/to/EPHEMERAL_TEST_PROJECT/index.gts",
            "version": 0,
          },
          "message": "Property 'startupTimee' does not exist on type 'Application'. Did you mean 'startupTime'?",
          "range": {
            "end": {
              "character": 43,
              "line": 12,
            },
            "start": {
              "character": 31,
              "line": 12,
            },
          },
          "relatedInformation": [
            {
              "location": {
                "range": {
                  "end": {
                    "character": 21,
                    "line": 8,
                  },
                  "start": {
                    "character": 10,
                    "line": 8,
                  },
                },
                "uri": "file:///path/to/EPHEMERAL_TEST_PROJECT/index.gts",
              },
              "message": "'startupTime' is declared here.",
            },
          ],
          "severity": 1,
          "source": "glint",
        },
      ]
    `);
  });

  // skipping until we tackle two-file components
  test.skip('reports diagnostics for a companion template type error', async () => {
    let script = stripIndent`
      import Component from '@glimmer/component';

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

    project.setGlintConfig({ environment: 'ember-loose' });
    project.write('controllers/foo.ts', script);
    project.write('templates/foo.hbs', template);

    let server = await project.startLanguageServer();
    let scriptDiagnostics = server.getDiagnostics(project.fileURI('controllers/foo.ts'));
    let templateDiagnostics = server.getDiagnostics(project.fileURI('templates/foo.hbs'));

    expect(scriptDiagnostics).toMatchInlineSnapshot(`
      [
        {
          "code": 6133,
          "message": "'startupTime' is declared but its value is never read.",
          "range": {
            "end": {
              "character": 21,
              "line": 7,
            },
            "start": {
              "character": 10,
              "line": 7,
            },
          },
          "severity": 4,
          "source": "glint",
          "tags": [
            1,
          ],
        },
      ]
    `);

    expect(templateDiagnostics).toMatchInlineSnapshot(`
      [
        {
          "code": 2551,
          "message": "Property 'startupTimee' does not exist on type 'Application'. Did you mean 'startupTime'?",
          "range": {
            "end": {
              "character": 39,
              "line": 1,
            },
            "start": {
              "character": 27,
              "line": 1,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
      ]
    `);

    server.openFile(project.fileURI('templates/foo.hbs'), template);
    server.updateFile(
      project.fileURI('templates/foo.hbs'),
      template.replace('startupTimee', 'startupTime'),
    );

    expect(server.getDiagnostics(project.fileURI('controllers/foo.ts'))).toEqual([]);
    expect(server.getDiagnostics(project.fileURI('templates/foo.hbs'))).toEqual([]);
  });
});
