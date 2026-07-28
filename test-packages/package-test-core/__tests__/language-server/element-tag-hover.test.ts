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

    expect(hover.displayString).toMatchInlineSnapshot(`"MyCustomElement"`);
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
      {
        "definitions": [
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
        ],
        "textSpan": {
          "end": {
            "line": 2,
            "offset": 21,
          },
          "start": {
            "line": 2,
            "offset": 4,
          },
        },
      }
    `);
  });

  test('hovering a registered custom element attribute shows the attribute type', async () => {
    const [offset, content] = extractCursor(stripIndent`
      export const Usage = <template>
        <my-custom-element prop-%num={{123}} prop-str="hello"></my-custom-element>
      </template>;
    `);

    const doc = await prepareDocument(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      content,
    );

    const hover = await performHoverRequest(doc, offset);

    expect(hover.displayString).toMatchInlineSnapshot(`"(property) 'prop-num': number"`);
  });

  test('go-to-definition on a custom element attribute resolves to its registry entry', async () => {
    const [offset, content] = extractCursor(stripIndent`
      export const Usage = <template>
        <my-custom-element prop-%num={{123}} prop-str="hello"></my-custom-element>
      </template>;
    `);

    const doc = await prepareDocument(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      content,
    );

    const definitions = await performDefinitionRequest(doc, offset);

    expect(definitions).toMatchInlineSnapshot(`
      {
        "definitions": [
          {
            "contextEnd": {
              "line": 18,
              "offset": 26,
            },
            "contextStart": {
              "line": 18,
              "offset": 7,
            },
            "end": {
              "line": 18,
              "offset": 17,
            },
            "file": "\${testWorkspacePath}/ts-template-imports-app/src/custom-elements.gts",
            "start": {
              "line": 18,
              "offset": 7,
            },
          },
        ],
        "textSpan": {
          "end": {
            "line": 2,
            "offset": 30,
          },
          "start": {
            "line": 2,
            "offset": 22,
          },
        },
      }
    `);
  });

  test('hovering a built-in element attribute shows the attribute type', async () => {
    const [offset, content] = extractCursor(stripIndent`
      export const Usage = <template>
        <div cla%ss="x"></div>
      </template>;
    `);

    const doc = await prepareDocument(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      content,
    );

    const hover = await performHoverRequest(doc, offset);

    expect(hover.displayString).toMatchInlineSnapshot(`"(property) class: string"`);
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

    expect(hover.displayString).toMatchInlineSnapshot(`"HTMLDivElement"`);
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

// `definitionAndBoundSpan` is what real editors issue (VS Code's TS
// integration and most LSP clients), and unlike the plain `definition`
// command it also requires the origin ("bound") span to translate back to
// the template — a regression surface of its own (see
// `getDefinitionAndBoundSpan` in the tsserver plugin).
async function performDefinitionRequest(document: TextDocument, offset: number): Promise<any> {
  const workspaceHelper = await getSharedTestWorkspaceHelper();

  const res = await workspaceHelper.tsserver.message({
    seq: workspaceHelper.nextSeq(),
    command: 'definitionAndBoundSpan',
    arguments: {
      file: URI.parse(document.uri).fsPath,
      position: offset,
    },
  });
  expect(res.success).toBe(true);

  for (const ref of res.body.definitions ?? []) {
    ref.file = '${testWorkspacePath}' + ref.file.slice(testWorkspacePath.length);
  }
  return res.body;
}
