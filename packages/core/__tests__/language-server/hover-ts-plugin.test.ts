import {
  getSharedTestWorkspaceHelper,
  teardownSharedTestWorkspaceAfterEach,
  prepareDocument,
  testWorkspacePath,
  extractCursor,
  extractCursors,
} from 'glint-monorepo-test-utils';
import { describe, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';
import { URI } from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-textdocument';

describe('Language Server: Hover (ts plugin)', () => {
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test.skip('querying a standalone template', async () => {
    const [offset, content] = extractCursor(stripIndent`
      <Foo as |foo|>{{f%oo}}</Foo>
    `);

    const doc = await prepareDocument(
      'ts-template-imports-app/src/index.hbs',
      'handlebars',
      content
    );

    expect(await performHoverRequest(doc, offset)).toMatchInlineSnapshot();
  });

  test('using private properties', async () => {
    const [offset, content] = extractCursor(stripIndent`
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        /** A message. */
        private message = 'hi';

        <template>
          {{this.m%essage}}
        </template>
      }
    `);

    const doc = await prepareDocument(
      'ts-template-imports-app/src/ephemeral.gts',
      'glimmer-ts',
      content
    );

    expect(await performHoverRequest(doc, offset)).toMatchInlineSnapshot(`
      {
        "displayString": "(property) MyComponent.message: string",
        "documentation": "A message.",
        "end": {
          "line": 8,
          "offset": 19,
        },
        "kind": "property",
        "kindModifiers": "private",
        "start": {
          "line": 8,
          "offset": 12,
        },
        "tags": [],
      }
    `);
  });

  test('using args', async () => {
    const [offset, content] = extractCursor(stripIndent`
      import Component from '@glimmer/component';

      interface MyComponentArgs {
        /** Some string */
        str: string;
      }

      export default class MyComponent extends Component<{ Args: MyComponentArgs }> {
        <template>
          {{@s%tr}}
        </template>
      }
    `);

    const doc = await prepareDocument(
      'ts-template-imports-app/src/ephemeral.gts',
      'glimmer-ts',
      content
    );

    expect(await performHoverRequest(doc, offset)).toMatchInlineSnapshot();
  });

  test('curly block params', async () => {
    const [offset, content] = extractCursor(stripIndent`
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        <template>
          {{#each "abc" as |item index|}}
            Item #{{ind%ex}}: {{item}}<br>
          {{/each}}
        </template>
      }
    `);

    const doc = await prepareDocument(
      'ts-template-imports-app/src/ephemeral.gts',
      'glimmer-ts',
      content
    );

    expect(await performHoverRequest(doc, offset)).toMatchInlineSnapshot();
  });

  test('module details', async () => {
    const [offset, content] = extractCursor(stripIndent`
      import { foo } from './f%oo';

      console.log(foo);
    `);

    await prepareDocument(
      'ts-template-imports-app/src/foo.ts',
      'typescript',
      stripIndent`
        export const foo = 'hi';
      `
    );

    const doc = await prepareDocument(
      'ts-template-imports-app/src/index.ts',
      'typescript',
      content
    );

    expect(await performHoverRequest(doc, offset)).toMatchInlineSnapshot();
  });

  describe.skip('JS in a TS project', () => {
    test('with allowJs: true', async () => {
      const [offset, content] = extractCursor(stripIndent`
        {{this.mes%sage}}
      `);

      await prepareDocument(
        'ts-template-imports-app/src/index.js',
        'javascript',
        stripIndent`
          import Component from '@glimmer/component';

          export default class MyComponent extends Component {
            message = 'hi';
          }
        `
      );

      const doc = await prepareDocument(
        'ts-template-imports-app/src/index.hbs',
        'handlebars',
        content
      );

      expect(await performHoverRequest(doc, offset)).toMatchInlineSnapshot();
    });

    test('allowJs: false', async () => {
      const [offset, content] = extractCursor(stripIndent`
        {{this.mes%sage}}
      `);

      await prepareDocument(
        'ts-template-imports-app/src/index.js',
        'javascript',
        stripIndent`
          import Component from '@glimmer/component';

          export default class MyComponent extends Component {
            message = 'hi';
          }
        `
      );

      const doc = await prepareDocument(
        'ts-template-imports-app/src/index.hbs',
        'handlebars',
        content
      );

      expect(await performHoverRequest(doc, offset)).toMatchInlineSnapshot();
    });
  });
});

async function performHoverRequest(document: TextDocument, offset: number) {
  const workspaceHelper = await getSharedTestWorkspaceHelper();

  const res = await workspaceHelper.tsserver.message({
    seq: workspaceHelper.nextSeq(),
    command: 'quickinfo',
    arguments: {
      file: URI.parse(document.uri).fsPath,
      position: offset,
    },
  });
  expect(res.success).toBe(true);

  return res.body;
}
