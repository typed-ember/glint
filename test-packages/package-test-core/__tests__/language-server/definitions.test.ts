import {
  getSharedTestWorkspaceHelper,
  teardownSharedTestWorkspaceAfterEach,
  prepareDocument,
  testWorkspacePath,
  extractCursor,
  extractCursors,
} from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';
import { URI } from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-textdocument';

describe('Language Server: Definitions (ts plugin)', () => {
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test('component invocation', async () => {
    expect(
      await requestDefinition(
        'ts-template-imports-app/src/ephemeral.gts',
        'glimmer-ts',
        stripIndent`
        import Component from '@glimmer/component';
        import Greeting from './Greeting.gts';

        export default class Application extends Component {
          <template>
            <Gr%eeting @message="hello" />
          </template>
        }
      `,
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "contextEnd": {
            "line": 14,
            "offset": 2,
          },
          "contextStart": {
            "line": 8,
            "offset": 1,
          },
          "end": {
            "line": 8,
            "offset": 30,
          },
          "file": "\${testWorkspacePath}/ts-template-imports-app/src/Greeting.gts",
          "start": {
            "line": 8,
            "offset": 22,
          },
        },
      ]
    `);
  });

  test('(typescript.glimmer) component invocation', async () => {
    expect(
      await requestDefinition(
        'ts-template-imports-app/src/ephemeral.gts',
        'typescript.glimmer',
        stripIndent`
        import Component from '@glimmer/component';
        import Greeting from './Greeting.gts';

        export default class Application extends Component {
          <template>
            <Gr%eeting @message="hello" />
          </template>
        }
      `,
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "contextEnd": {
            "line": 14,
            "offset": 2,
          },
          "contextStart": {
            "line": 8,
            "offset": 1,
          },
          "end": {
            "line": 8,
            "offset": 30,
          },
          "file": "\${testWorkspacePath}/ts-template-imports-app/src/Greeting.gts",
          "start": {
            "line": 8,
            "offset": 22,
          },
        },
      ]
    `);
  });

  test('arg passing', async () => {
    expect(
      await requestDefinition(
        'ts-template-imports-app/src/ephemeral.gts',
        'glimmer-ts',
        stripIndent`
        import Component from '@glimmer/component';
        import Greeting from './Greeting.gts';

        export default class Application extends Component {
          <template>
            <Greeting @ta%rget="hello" />
          </template>
        }
      `,
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "contextEnd": {
            "line": 5,
            "offset": 25,
          },
          "contextStart": {
            "line": 5,
            "offset": 11,
          },
          "end": {
            "line": 5,
            "offset": 17,
          },
          "file": "\${testWorkspacePath}/ts-template-imports-app/src/Greeting.gts",
          "start": {
            "line": 5,
            "offset": 11,
          },
        },
      ]
    `);
  });

  test('arg use', async () => {
    expect(
      await requestDefinition(
        'ts-template-imports-app/src/ephemeral.gts',
        'glimmer-ts',
        stripIndent`
        import Component from '@glimmer/component';

        export type GreetingArgs = {
          message: string;
        };

        export default class Greeting extends Component<{ Args: GreetingArgs }> {
          <template>{{@mes%sage}}, World!</template>
        }
      `,
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "contextEnd": {
            "line": 4,
            "offset": 19,
          },
          "contextStart": {
            "line": 4,
            "offset": 3,
          },
          "end": {
            "line": 4,
            "offset": 10,
          },
          "file": "\${testWorkspacePath}/ts-template-imports-app/src/ephemeral.gts",
          "start": {
            "line": 4,
            "offset": 3,
          },
        },
      ]
    `);
  });
});

async function requestDefinition(
  fileName: string,
  languageId: string,
  contentWithCursor: string,
): Promise<any> {
  const [offset, content] = extractCursor(contentWithCursor);

  let document = await prepareDocument(fileName, languageId, content);

  const res = await performDefinitionRequest(document, offset);

  return res;
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
