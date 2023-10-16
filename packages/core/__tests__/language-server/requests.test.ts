import { Project } from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';
import * as ts from 'typescript';

describe('Language Server: Requests', () => {
  let project!: Project;

  beforeEach(async () => {
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('no imports', () => {
    project.write({
      'index.ts': stripIndent`

      export default class Application extends Component {
        static template = hbs\`
          Hello, world!
        \`;
      }
      `,
    });

    let server = project.startLanguageServer();
    let formatting = ts.getDefaultFormatCodeSettings();
    let preferences = {};
    let edits = server.organizeImports(project.fileURI('index.ts'), formatting, preferences);

    expect(edits).toEqual([]);
  });

  test('single import', () => {
    project.write({
      'index.ts': stripIndent`
      import Component, { hbs } from '@glimmerx/component';

      export default class Application extends Component {
        static template = hbs\`
          Hello, world!
        \`;
      }
      `,
    });

    let server = project.startLanguageServer();
    let formatting = ts.getDefaultFormatCodeSettings();
    let preferences = {};
    let edits = server.organizeImports(project.fileURI('index.ts'), formatting, preferences);

    expect(edits).toEqual([]);
  });

  test('many imports, unsorted', () => {
    project.write({
      'index.ts': stripIndent`
        import './App.css';
        import EmberComponent from './ember-component';
        import Component from '@ember/component';
        import logo from './logo.svg';
        import { ComponentLike, WithBoundArgs } from '@glint/template';

        interface WrapperComponentSignature {
          Blocks: {
            default: [
              {
                InnerComponent: WithBoundArgs<typeof EmberComponent, 'required'>;
                MaybeComponent?: ComponentLike<{ Args: { key: string } }>;
              }
            ];
          };
        }

        export default class WrapperComponent extends Component<WrapperComponentSignature> {
          logo = logo
        }
      `,
    });

    let server = project.startLanguageServer();

    let formatting = ts.getDefaultFormatCodeSettings();
    let preferences = {};
    let edits = server.organizeImports(project.fileURI('index.ts'), formatting, preferences);

    expect(edits).toEqual([
      {
        newText:
          "import Component from '@ember/component';\nimport { ComponentLike, WithBoundArgs } from '@glint/template';\nimport './App.css';\nimport EmberComponent from './ember-component';\nimport logo from './logo.svg';\n",
        range: {
          start: { character: 0, line: 0 },
          end: { character: 0, line: 1 },
        },
      },
      {
        newText: '',
        range: {
          start: { character: 0, line: 1 },
          end: { character: 0, line: 2 },
        },
      },
      {
        newText: '',
        range: {
          start: { character: 0, line: 2 },
          end: { character: 0, line: 3 },
        },
      },
      {
        newText: '',
        range: {
          start: { character: 0, line: 3 },
          end: { character: 0, line: 4 },
        },
      },
      {
        newText: '',
        range: {
          start: { character: 0, line: 4 },
          end: { character: 0, line: 5 },
        },
      },
    ]);

    test('many imports, sorted', () => {
      project.write({
        'index.ts': stripIndent`
        import Component from '@ember/component';
        import { ComponentLike, WithBoundArgs } from '@glint/template';
        import EmberComponent from './ember-component';
        import './App.css';
        import logo from './logo.svg';

          interface WrapperComponentSignature {
            Blocks: {
              default: [
                {
                  InnerComponent: WithBoundArgs<typeof EmberComponent, 'required'>;
                  MaybeComponent?: ComponentLike<{ Args: { key: string } }>;
                }
              ];
            };
          }

          export default class WrapperComponent extends Component<WrapperComponentSignature> {
            logo = logo
          }
        `,
      });

      let server = project.startLanguageServer();

      let formatting = ts.getDefaultFormatCodeSettings();
      let preferences = {};
      let edits = server.organizeImports(project.fileURI('index.ts'), formatting, preferences);

      expect(edits).toEqual([
        {
          newText:
            "import Component from '@ember/component';\nimport { ComponentLike, WithBoundArgs } from '@glint/template';\nimport './App.css';\nimport EmberComponent from './ember-component';\nimport logo from './logo.svg';\n",
          range: {
            start: { character: 0, line: 0 },
            end: { character: 0, line: 1 },
          },
        },
        {
          newText: '',
          range: {
            start: { character: 0, line: 1 },
            end: { character: 0, line: 2 },
          },
        },
        {
          newText: '',
          range: {
            start: { character: 0, line: 2 },
            end: { character: 0, line: 3 },
          },
        },
        {
          newText: '',
          range: {
            start: { character: 0, line: 3 },
            end: { character: 0, line: 4 },
          },
        },
        {
          newText: '',
          range: {
            start: { character: 0, line: 4 },
            end: { character: 0, line: 5 },
          },
        },
      ]);
    });
  });

  test('many imports, already sorted', () => {
    project.write({
      'index.ts': stripIndent`
        import Component from '@ember/component';
        import { ComponentLike, WithBoundArgs } from '@glint/template';
        import './App.css';
        import EmberComponent from './ember-component';
        import logo from './logo.svg';

        interface WrapperComponentSignature {
          Blocks: {
            default: [
              {
                InnerComponent: WithBoundArgs<typeof EmberComponent, 'required'>;
                MaybeComponent?: ComponentLike<{ Args: { key: string } }>;
              }
            ];
          };
        }

        export default class WrapperComponent extends Component<WrapperComponentSignature> {
          logo = logo
        }
      `,
    });

    let server = project.startLanguageServer();

    let formatting = ts.getDefaultFormatCodeSettings();
    let preferences = {};
    let edits = server.organizeImports(project.fileURI('index.ts'), formatting, preferences);

    expect(edits).toEqual([
      {
        newText:
          "import Component from '@ember/component';\nimport { ComponentLike, WithBoundArgs } from '@glint/template';\nimport './App.css';\nimport EmberComponent from './ember-component';\nimport logo from './logo.svg';\n",
        range: {
          start: { character: 0, line: 0 },
          end: { character: 0, line: 1 },
        },
      },
      {
        newText: '',
        range: {
          start: { character: 0, line: 1 },
          end: { character: 0, line: 2 },
        },
      },
      {
        newText: '',
        range: {
          start: { character: 0, line: 2 },
          end: { character: 0, line: 3 },
        },
      },
      {
        newText: '',
        range: {
          start: { character: 0, line: 3 },
          end: { character: 0, line: 4 },
        },
      },
      {
        newText: '',
        range: {
          start: { character: 0, line: 4 },
          end: { character: 0, line: 5 },
        },
      },
    ]);
  });

  test('gts import sorting', () => {
    project.setGlintConfig({ environment: 'ember-template-imports' });
    project.write({
      'index.gts': stripIndent`
      import Component from '@glimmer/component';
      import { TOC } from '@ember/component/template-only';
      import { hash } from '@ember/helper';

      const MaybeComponent: undefined as TOC<{ Args: { arg: string } }> | undefined;

      class List<T> extends Component {
        <template>
          <MaybeComponent />
          <ol>
            {{#each-in (hash a=1 b='hi') as |key value|}}
              <li>{{key}}: {{value}}</li>
            {{/each-in}}
          </ol>
        </template>
      }
      `,
    });

    let server = project.startLanguageServer();

    let formatting = ts.getDefaultFormatCodeSettings();
    let preferences = {};
    let edits = server.organizeImports(project.fileURI('index.gts'), formatting, preferences);

    expect(edits).toEqual([
      {
        newText:
          "import { TOC } from '@ember/component/template-only';\nimport { hash } from '@ember/helper';\nimport Component from '@glimmer/component';\n",
        range: {
          start: { character: 0, line: 0 },
          end: { character: 0, line: 1 },
        },
      },
      {
        newText: '',
        range: {
          start: { character: 0, line: 1 },
          end: { character: 0, line: 2 },
        },
      },
      {
        newText: '',
        range: {
          start: { character: 0, line: 2 },
          end: { character: 0, line: 3 },
        },
      },
    ]);
  });
});
