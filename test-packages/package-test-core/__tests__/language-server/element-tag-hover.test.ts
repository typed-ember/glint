import { stripIndent } from 'common-tags';
import {
  extractCursor,
  getSharedTestWorkspaceHelper,
  prepareDocument,
  teardownSharedTestWorkspaceAfterEach,
  testWorkspacePath,
} from 'glint-monorepo-test-utils';
import { afterEach, describe, expect, test } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';

// The `my-custom-element` registrations used here live in
// `ts-template-imports-app/src/custom-elements.gts`.
describe('Language Server: element tag hover and definition (ts plugin)', () => {
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test('hovering a registered custom element shows its element type', async () => {
    const [offset, content] = extractCursor(stripIndent`
      export const Usage = <template>
        <my-cus%tom-element prop-num={{123}} prop-str="hello"></my-custom-element>
      </template>;
    `);

    const doc = await prepareDocument(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      content,
    );

    const hover = await performHoverRequest(doc, offset);

    expect(hover.displayString).toMatchInlineSnapshot(
      `"(property) my_custom_element: MyCustomElement"`,
    );
  });

  test('go-to-definition on a registered custom element resolves to its registry entry', async () => {
    const [offset, content] = extractCursor(stripIndent`
      export const Usage = <template>
        <my-cus%tom-element prop-num={{123}} prop-str="hello"></my-custom-element>
      </template>;
    `);

    const doc = await prepareDocument(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      content,
    );

    const definitions = await performDefinitionRequest(doc, offset);

    expect(definitions).toMatchInlineSnapshot(`
      [
        {
          "contextEnd": {
            "line": 13,
            "offset": 42,
          },
          "contextStart": {
            "line": 13,
            "offset": 5,
          },
          "end": {
            "line": 13,
            "offset": 24,
          },
          "file": "\${testWorkspacePath}/ts-template-imports-app/src/custom-elements.gts",
          "start": {
            "line": 13,
            "offset": 5,
          },
        },
      ]
    `);
  });

  test('hovering a built-in element shows its element type', async () => {
    const [offset, content] = extractCursor(stripIndent`
      export const Usage = <template>
        <di%v></div>
      </template>;
    `);

    const doc = await prepareDocument(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      content,
    );

    const hover = await performHoverRequest(doc, offset);

    expect(hover.displayString).toMatchInlineSnapshot(
      `"(property) HTMLElementTagNameMap["div"]: HTMLDivElement"`,
    );
  });
});

async function performHoverRequest(document: TextDocument, offset: number): Promise<any> {
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

async function performDefinitionRequest(document: TextDocument, offset: number): Promise<any> {
  const workspaceHelper = await getSharedTestWorkspaceHelper();

  const res = await workspaceHelper.tsserver.message({
    seq: workspaceHelper.nextSeq(),
    command: 'definition',
    arguments: {
      file: URI.parse(document.uri).fsPath,
      position: offset,
    },
  });
  expect(res.success).toBe(true);

  for (const ref of res.body) {
    ref.file = '${testWorkspacePath}' + ref.file.slice(testWorkspacePath.length);
  }
  return res.body;
}
