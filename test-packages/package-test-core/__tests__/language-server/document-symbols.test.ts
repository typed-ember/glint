import {
  getSharedTestWorkspaceHelper,
  teardownSharedTestWorkspaceAfterEach,
  prepareDocument,
} from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';
import { URI } from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-textdocument';

describe('Language Server: Document Symbols (language server)', () => {
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test('component invocation', async () => {
    const document = await prepareDocument(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      stripIndent`
        import Component from '@glimmer/component';
        import Greeting from './Greeting.gts';

        export default class Application extends Component {
          <template>
            <Greeting @message="hello" />
          </template>
        }
      `,
    );

    const symbols = await performDocumentSymbolsRequest(document);

    expect(symbols).toMatchInlineSnapshot(`
      [
        {
          "children": [
            {
              "kind": 2,
              "name": "template",
              "range": {
                "end": {
                  "character": 13,
                  "line": 6,
                },
                "start": {
                  "character": 2,
                  "line": 4,
                },
              },
              "selectionRange": {
                "end": {
                  "character": 13,
                  "line": 6,
                },
                "start": {
                  "character": 2,
                  "line": 4,
                },
              },
            },
          ],
          "kind": 5,
          "name": "Application",
          "range": {
            "end": {
              "character": 1,
              "line": 7,
            },
            "start": {
              "character": 0,
              "line": 3,
            },
          },
          "selectionRange": {
            "end": {
              "character": 32,
              "line": 3,
            },
            "start": {
              "character": 21,
              "line": 3,
            },
          },
        },
      ]
    `);
  });
});

async function performDocumentSymbolsRequest(document: TextDocument): Promise<any> {
  const workspaceHelper = await getSharedTestWorkspaceHelper();

  const res = await workspaceHelper.glintserver.sendDocumentSymbolRequest(document.uri);

  return res;
}
