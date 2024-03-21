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

    test('disabled', () => {
      project.setGlintConfig({
        environment: 'ember-loose',
        checkStandaloneTemplates: false,
      });

      let server = project.startLanguageServer();
      let templateDiagnostics = server.getDiagnostics(project.fileURI('my-component.hbs'));

      expect(templateDiagnostics).toEqual([]);
    });

    test('enabled', () => {
      project.setGlintConfig({
        environment: 'ember-loose',
        checkStandaloneTemplates: true,
      });

      let server = project.startLanguageServer();
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

  describe('external file changes', () => {
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

    test('adding a backing module', () => {
      project.write('component.hbs', '{{@foo}}');

      let server = project.startLanguageServer();
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

    test('removing a backing module', () => {
      project.write('component.hbs', '{{@foo}}');
      project.write('component.ts', scriptContents);

      let server = project.startLanguageServer();
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

  test('reports diagnostics for an inline template type error', () => {
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

    let server = project.startLanguageServer();
    let diagnostics = server.getDiagnostics(project.fileURI('index.gts'));

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "code": 6133,
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
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
      ]
    `);

    server.openFile(project.fileURI('index.gts'), code);
    server.updateFile(project.fileURI('index.gts'), code.replace('startupTimee', 'startupTime'));

    expect(server.getDiagnostics(project.fileURI('index.gts'))).toEqual([]);
  });

  test('reports diagnostics for a companion template type error', () => {
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

    let server = project.startLanguageServer();
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
      template.replace('startupTimee', 'startupTime')
    );

    expect(server.getDiagnostics(project.fileURI('controllers/foo.ts'))).toEqual([]);
    expect(server.getDiagnostics(project.fileURI('templates/foo.hbs'))).toEqual([]);
  });

  test('honors @glint-ignore and @glint-expect-error', () => {
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

    project.write('component-a.gts', componentA);
    project.write('component-b.gts', componentB);

    let server = project.startLanguageServer();

    expect(server.getDiagnostics(project.fileURI('component-a.gts'))).toEqual([]);
    expect(server.getDiagnostics(project.fileURI('component-b.gts'))).toEqual([]);

    server.openFile(project.fileURI('component-a.gts'), componentA);
    server.updateFile(
      project.fileURI('component-a.gts'),
      componentA.replace('{{! @glint-expect-error }}', '')
    );

    expect(server.getDiagnostics(project.fileURI('component-b.gts'))).toEqual([]);
    expect(server.getDiagnostics(project.fileURI('component-a.gts'))).toMatchInlineSnapshot(`
      [
        {
          "code": 2339,
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
          "tags": [],
        },
      ]
    `);

    server.updateFile(project.fileURI('component-a.gts'), componentA);

    expect(server.getDiagnostics(project.fileURI('component-a.gts'))).toEqual([]);
    expect(server.getDiagnostics(project.fileURI('component-b.gts'))).toEqual([]);

    server.updateFile(project.fileURI('component-a.gts'), componentA.replace('{{@version}}', ''));

    expect(server.getDiagnostics(project.fileURI('component-b.gts'))).toEqual([]);
    expect(server.getDiagnostics(project.fileURI('component-a.gts'))).toMatchInlineSnapshot(`
      [
        {
          "code": 0,
          "message": "Unused '@glint-expect-error' directive.",
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
          "tags": [],
        },
      ]
    `);
  });
});
