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

  describe('checkStandaloneTemplates', () => {
    beforeEach(() => {
      let registry = stripIndent`
        import { ComponentLike } from '@glint/template';

        declare module '@glint/environment-ember-loose/registry' {
          export default interface Registry {
            Foo: ComponentLike<{ Args: { name: string } }>;
          }
        }
      `;

      let template = stripIndent`
        {{@missingArg}}

        <Foo @name={{123}} />
      `;

      project.write('registry.d.ts', registry);
      project.write('my-component.hbs', template);
    });

    test.skip('disabled', async () => {
      project.setGlintConfig({
        environment: 'ember-loose',
        checkStandaloneTemplates: false,
      });

      let server = await project.startLanguageServer();
      let templateDiagnostics = server.getDiagnostics(project.fileURI('my-component.hbs'));

      expect(templateDiagnostics).toEqual([]);
    });

    test.skip('enabled', async () => {
      project.setGlintConfig({
        environment: 'ember-loose',
        checkStandaloneTemplates: true,
      });

      let server = await project.startLanguageServer();
      let templateDiagnostics = server.getDiagnostics(project.fileURI('my-component.hbs'));

      expect(templateDiagnostics).toMatchInlineSnapshot(`
        [
          {
            "code": 2339,
            "message": "Property 'missingArg' does not exist on type '{}'.",
            "range": {
              "end": {
                "character": 13,
                "line": 0,
              },
              "start": {
                "character": 3,
                "line": 0,
              },
            },
            "severity": 1,
            "source": "glint",
            "tags": [],
          },
          {
            "code": 2322,
            "message": "Type 'number' is not assignable to type 'string'.",
            "range": {
              "end": {
                "character": 10,
                "line": 2,
              },
              "start": {
                "character": 6,
                "line": 2,
              },
            },
            "severity": 1,
            "source": "glint",
            "tags": [],
          },
        ]
      `);
    });
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

  test('honors @glint-ignore and @glint-expect-error', async () => {
    let componentA = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentA extends Component {
        <template>
          {{! @glint-expect-error }}
          Welcome to app <code>v{{@version}}</code>.
        </template>
      }
    `;

    let componentB = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentB extends Component {
        public startupTime = new Date().toISOString();

        <template>
          {{! @glint-ignore: this looks like a typo but for some reason it isn't }}
          The current time is {{this.startupTimee}}.
        </template>
      }
    `;

    let server = await project.startLanguageServer();

    project.write('component-a.gts', componentA);
    project.write('component-b.gts', componentB);

    const docA = await server.openTextDocument(project.filePath('component-a.gts'), 'glimmer-ts');
    let diagnostics = await server.sendDocumentDiagnosticRequest(docA.uri);

    expect(diagnostics.items).toEqual([]);

    const docB = await server.openTextDocument(project.filePath('component-b.gts'), 'glimmer-ts');
    diagnostics = await server.sendDocumentDiagnosticRequest(docB.uri);
    expect(diagnostics.items).toEqual([]);

    await server.openTextDocument(project.filePath('component-a.gts'), 'glimmer-ts');
    await server.replaceTextDocument(
      project.fileURI('component-a.gts'),
      componentA.replace('{{! @glint-expect-error }}', ''),
    );

    expect(
      (await server.sendDocumentDiagnosticRequest(project.fileURI('component-b.gts'))).items,
    ).toEqual([]);
    expect((await server.sendDocumentDiagnosticRequest(project.fileURI('component-a.gts'))).items)
      .toMatchInlineSnapshot(`
      [
        {
          "code": 2339,
          "data": {
            "documentUri": "volar-embedded-content://URI_ENCODED_PATH_TO/FILE",
            "isFormat": false,
            "original": {},
            "pluginIndex": 0,
            "uri": "file:///path/to/EPHEMERAL_TEST_PROJECT/component-a.gts",
            "version": 1,
          },
          "message": "Property 'version' does not exist on type '{}'.",
          "range": {
            "end": {
              "character": 36,
              "line": 5,
            },
            "start": {
              "character": 29,
              "line": 5,
            },
          },
          "severity": 1,
          "source": "glint",
        },
      ]
    `);

    await server.replaceTextDocument(project.fileURI('component-a.gts'), componentA);

    expect(
      (await server.sendDocumentDiagnosticRequest(project.fileURI('component-a.gts'))).items,
    ).toEqual([]);
    expect(
      (await server.sendDocumentDiagnosticRequest(project.fileURI('component-b.gts'))).items,
    ).toEqual([]);

    await server.replaceTextDocument(
      project.fileURI('component-a.gts'),
      componentA.replace('{{@version}}', ''),
    );

    expect(
      (await server.sendDocumentDiagnosticRequest(project.fileURI('component-b.gts'))).items,
    ).toEqual([]);

    expect(
      (await server.sendDocumentDiagnosticRequest(project.fileURI('component-a.gts'))).items.length,
    ).toEqual(1);

    expect(await server.sendDocumentDiagnosticRequest(project.fileURI('component-a.gts')))
      .toMatchInlineSnapshot(`
        {
          "items": [
            {
              "code": 2578,
              "data": {
                "documentUri": "volar-embedded-content://URI_ENCODED_PATH_TO/FILE",
                "isFormat": false,
                "original": {},
                "pluginIndex": 0,
                "uri": "file:///path/to/EPHEMERAL_TEST_PROJECT/component-a.gts",
                "version": 3,
              },
              "message": "Unused '@ts-expect-error' directive.",
              "range": {
                "end": {
                  "character": 30,
                  "line": 4,
                },
                "start": {
                  "character": 4,
                  "line": 4,
                },
              },
              "severity": 1,
              "source": "glint",
            },
          ],
          "kind": "full",
        }
      `);
  });

  test('@glint-expect-error - unknown component reference', async () => {
    let componentA = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentA extends Component {
        <template>
          {{! @glint-expect-error }}
          <Wat>
            {{this.unknownReference}}
          </Wat>
        </template>
      }
    `;

    let server = await project.startLanguageServer();

    project.write('component-a.gts', componentA);

    const docA = await server.openTextDocument(project.filePath('component-a.gts'), 'glimmer-ts');
    let diagnostics = await server.sendDocumentDiagnosticRequest(docA.uri);

    expect(diagnostics.items.length).toEqual(1);
  });

  test('@glint-expect-error - unknown component reference', async () => {
    let componentA = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentA extends Component {
        <template>
          {{! @glint-expect-error }}
          <Wat>
            {{this.unknownReference}}
          </Wat>
        </template>
      }
    `;

    let server = await project.startLanguageServer();

    project.write('component-a.gts', componentA);

    const docA = await server.openTextDocument(project.filePath('component-a.gts'), 'glimmer-ts');
    let diagnostics = await server.sendDocumentDiagnosticRequest(docA.uri);

    expect(diagnostics.items.length).toEqual(1);
  });

  test('passing args to vanilla Component should be an error', async () => {
    let componentA = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentA extends Component {
        <template>
          <Component
            @foo={{123}} />
        </template>
      }
    `;

    let server = await project.startLanguageServer();

    project.write('component-a.gts', componentA);

    await server.openTextDocument(project.filePath('component-a.gts'), 'glimmer-ts');

    expect(await server.sendDocumentDiagnosticRequest(project.fileURI('component-a.gts')))
      .toMatchInlineSnapshot(`
      {
        "items": [
          {
            "code": 2554,
            "data": {
              "documentUri": "volar-embedded-content://URI_ENCODED_PATH_TO/FILE",
              "isFormat": false,
              "original": {},
              "pluginIndex": 0,
              "uri": "file:///path/to/EPHEMERAL_TEST_PROJECT/component-a.gts",
              "version": 0,
            },
            "message": "Expected 0 arguments, but got 1.",
            "range": {
              "end": {
                "character": 21,
                "line": 5,
              },
              "start": {
                "character": 4,
                "line": 4,
              },
            },
            "severity": 1,
            "source": "glint",
          },
        ],
        "kind": "full",
      }
    `);
  });

  test('passing args to vanilla Component should be an error -- suppressed with @glint-expect-error', async () => {
    let componentA = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentA extends Component {
        <template>
        {{! @glint-expect-error }}
          <Component
            @foo={{123}} />
        </template>
      }
    `;

    let server = await project.startLanguageServer();

    project.write('component-a.gts', componentA);

    await server.openTextDocument(project.filePath('component-a.gts'), 'glimmer-ts');

    expect(await server.sendDocumentDiagnosticRequest(project.fileURI('component-a.gts')))
      .toMatchInlineSnapshot(`
        {
          "items": [],
          "kind": "full",
        }
      `);
  });

  test('passing no args to a Component with args should be an error', async () => {
    let componentA = stripIndent`
      import Component from '@glimmer/component';

      interface GreetingSignature {
        Args: { target: string };
      }
        
      class Greeting extends Component<GreetingSignature> {
        <template>
          {{@target}}
        </template>
      }

      export default class extends Component {
        <template>
          <Greeting />
        </template>
      }
    `;

    let server = await project.startLanguageServer();

    project.write('component-a.gts', componentA);

    await server.openTextDocument(project.filePath('component-a.gts'), 'glimmer-ts');

    expect(await server.sendDocumentDiagnosticRequest(project.fileURI('component-a.gts')))
      .toMatchInlineSnapshot(`
        {
          "items": [
            {
              "code": 2554,
              "data": {
                "documentUri": "volar-embedded-content://URI_ENCODED_PATH_TO/FILE",
                "isFormat": false,
                "original": {},
                "pluginIndex": 0,
                "uri": "file:///path/to/EPHEMERAL_TEST_PROJECT/component-a.gts",
                "version": 0,
              },
              "message": "Expected 1 arguments, but got 0.",
              "range": {
                "end": {
                  "character": 16,
                  "line": 14,
                },
                "start": {
                  "character": 4,
                  "line": 14,
                },
              },
              "relatedInformation": [
                {
                  "location": {
                    "range": {
                      "end": {
                        "character": 48,
                        "line": 23,
                      },
                      "start": {
                        "character": 4,
                        "line": 23,
                      },
                    },
                    "uri": "file:///Users/machty/code/glint/packages/environment-ember-template-imports/-private/dsl/index.d.ts",
                  },
                  "message": "Arguments for the rest parameter 'args' were not provided.",
                },
              ],
              "severity": 1,
              "source": "glint",
            },
          ],
          "kind": "full",
        }
      `);
  });

  test('@glint-expect-error - open element tag inline directive', async () => {
    let componentA = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentA extends Component {
        <template>
          <Component
            {{! @glint-expect-error }}
            @foo={{unknownReference}} />
        </template>
      }
    `;

    let server = await project.startLanguageServer();

    project.write('component-a.gts', componentA);

    const docA = await server.openTextDocument(project.filePath('component-a.gts'), 'glimmer-ts');
    let diagnostics = await server.sendDocumentDiagnosticRequest(docA.uri);

    // expect(diagnostics.items.length).toEqual(0);

    expect(await server.sendDocumentDiagnosticRequest(project.fileURI('component-a.gts')))
      .toMatchInlineSnapshot(`
        {
          "items": [
            {
              "code": 2304,
              "data": {
                "documentUri": "volar-embedded-content://URI_ENCODED_PATH_TO/FILE",
                "isFormat": false,
                "original": {},
                "pluginIndex": 0,
                "uri": "file:///path/to/EPHEMERAL_TEST_PROJECT/component-a.gts",
                "version": 0,
              },
              "message": "Cannot find name 'unknownReference'.",
              "range": {
                "end": {
                  "character": 29,
                  "line": 6,
                },
                "start": {
                  "character": 13,
                  "line": 6,
                },
              },
              "severity": 1,
              "source": "glint",
            },
            {
              "code": 2554,
              "data": {
                "documentUri": "volar-embedded-content://URI_ENCODED_PATH_TO/FILE",
                "isFormat": false,
                "original": {},
                "pluginIndex": 0,
                "uri": "file:///path/to/EPHEMERAL_TEST_PROJECT/component-a.gts",
                "version": 0,
              },
              "message": "Expected 0 arguments, but got 1.",
              "range": {
                "end": {
                  "character": 34,
                  "line": 6,
                },
                "start": {
                  "character": 4,
                  "line": 4,
                },
              },
              "severity": 1,
              "source": "glint",
            },
          ],
          "kind": "full",
        }
      `);
  });
});
