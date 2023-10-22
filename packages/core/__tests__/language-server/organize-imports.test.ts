import { Project } from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';
import * as ts from 'typescript';

describe('Language Server: Organize Imports', () => {
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

  test('ts: handles sorting imports', () => {
    project.write({
      'index.ts': stripIndent`
        import './App.css';
        import EmberComponent from './ember-component';
        import Component from '@ember/component';

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

        // Second Import Block
        import logo from './logo.svg';
        import { ComponentLike, WithBoundArgs } from '@glint/template';

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
          "import Component from '@ember/component';\nimport './App.css';\nimport EmberComponent from './ember-component';\n",
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
        newText:
          "import { ComponentLike, WithBoundArgs } from '@glint/template';\nimport logo from './logo.svg';\n",
        range: {
          start: { character: 0, line: 16 },
          end: { character: 0, line: 17 },
        },
      },
      {
        newText: '',
        range: {
          start: { character: 0, line: 17 },
          end: { character: 0, line: 18 },
        },
      },
    ]);
  });

  test('gts: handles sorting imports', () => {
    project.setGlintConfig({ environment: 'ember-template-imports' });
    project.write({
      'index.gts': stripIndent`
      import Component from '@glimmer/component';
      import { hash } from '@ember/helper';

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

      // Second Import Block
      import { ComponentLike, ModifierLike, HelperLike } from '@glint/template';
      import { TOC } from '@ember/component/template-only';

      const MaybeComponent: undefined as TOC<{ Args: { arg: string } }> | undefined;
      declare const CanvasThing: ComponentLike<{ Args: { str: string }; Element: HTMLCanvasElement }>;
      `,
    });

    let server = project.startLanguageServer();

    let formatting = ts.getDefaultFormatCodeSettings();
    let preferences = {};
    let edits = server.organizeImports(project.fileURI('index.gts'), formatting, preferences);

    expect(edits).toEqual([
      {
        newText:
          "import { hash } from '@ember/helper';\nimport Component from '@glimmer/component';\n",
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
        newText:
          "import { TOC } from '@ember/component/template-only';\nimport { ComponentLike, HelperLike, ModifierLike } from '@glint/template';\n",
        range: {
          start: { character: 0, line: 15 },
          end: { character: 0, line: 16 },
        },
      },
      {
        newText: '',
        range: {
          start: { character: 0, line: 16 },
          end: { character: 0, line: 17 },
        },
      },
    ]);
  });
});
