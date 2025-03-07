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

describe('Language Server: References (ts plugin)', () => {
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test('component references', async () => {
    const [offset, content] = extractCursor(stripIndent`
      import Component from '@glimmer/component';

      export default class Gre%eting extends Component {
        private nested = Math.random() > 0.5;

        <template>
          {{#if this.nested}}
            <Greeting />!
          {{else}}
            Hello!
          {{/if}}
        </template>
      }
    `);

    const greetingDoc = await prepareDocument(
      'ts-template-imports-app/src/ephemeral-greeting.gts',
      'glimmer-ts',
      content,
    )

    await prepareDocument(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      stripIndent`
        import Component from '@glimmer/component';
        import Greeting from './ephemeral-greeting.gts';

        export default class Application extends Component {
          <template>
            <Greeting />
          </template>
        }
      `,
    );

    expect(
      await performReferencesRequest(
        greetingDoc,
        offset,
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "contextEnd": {
            "line": 13,
            "offset": 2,
          },
          "contextStart": {
            "line": 3,
            "offset": 1,
          },
          "end": {
            "line": 3,
            "offset": 30,
          },
          "file": "\${testWorkspacePath}/ts-template-imports-app/src/ephemeral-greeting.gts",
          "isDefinition": true,
          "isWriteAccess": true,
          "lineText": "export default class Greeting extends Component {",
          "start": {
            "line": 3,
            "offset": 22,
          },
        },
        {
          "end": {
            "line": 8,
            "offset": 16,
          },
          "file": "\${testWorkspacePath}/ts-template-imports-app/src/ephemeral-greeting.gts",
          "isDefinition": false,
          "isWriteAccess": false,
          "lineText": "      <Greeting />!",
          "start": {
            "line": 8,
            "offset": 8,
          },
        },
        {
          "contextEnd": {
            "line": 2,
            "offset": 49,
          },
          "contextStart": {
            "line": 2,
            "offset": 1,
          },
          "end": {
            "line": 2,
            "offset": 16,
          },
          "file": "\${testWorkspacePath}/ts-template-imports-app/src/empty-fixture.gts",
          "isDefinition": false,
          "isWriteAccess": true,
          "lineText": "import Greeting from './ephemeral-greeting.gts';",
          "start": {
            "line": 2,
            "offset": 8,
          },
        },
        {
          "end": {
            "line": 6,
            "offset": 14,
          },
          "file": "\${testWorkspacePath}/ts-template-imports-app/src/empty-fixture.gts",
          "isDefinition": false,
          "isWriteAccess": false,
          "lineText": "    <Greeting />",
          "start": {
            "line": 6,
            "offset": 6,
          },
        },
      ]
    `);
  });

  test('arg references', async () => {
    await prepareDocument(
      'ts-template-imports-app/src/ephemeral-greeting.gts',
      'glimmer-ts',
      stripIndent`
        import Component from '@glimmer/component';

        export type GreetingArgs = {
          /** Who to greet */
          target: string;
        };

        export default class Greeting extends Component<{ Args: GreetingArgs }> {
          <template>
            Hello, {{@target}}
          </template>
        }
      `,
    );

    expect(
      await requestReferences(
        'ts-template-imports-app/src/empty-fixture.gts',
        'glimmer-ts',
        stripIndent`
          import Component from '@glimmer/component';
          import Greeting from './ephemeral-greeting.gts';

          export default class Application extends Component {
            <template>
              <Greeting @tar%get="World" />
            </template>
          }
        `,
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "contextEnd": {
            "line": 5,
            "offset": 18,
          },
          "contextStart": {
            "line": 5,
            "offset": 3,
          },
          "end": {
            "line": 5,
            "offset": 9,
          },
          "file": "\${testWorkspacePath}/ts-template-imports-app/src/ephemeral-greeting.gts",
          "isDefinition": false,
          "isWriteAccess": false,
          "lineText": "  target: string;",
          "start": {
            "line": 5,
            "offset": 3,
          },
        },
        {
          "end": {
            "line": 10,
            "offset": 21,
          },
          "file": "\${testWorkspacePath}/ts-template-imports-app/src/ephemeral-greeting.gts",
          "isDefinition": false,
          "isWriteAccess": false,
          "lineText": "    Hello, {{@target}}",
          "start": {
            "line": 10,
            "offset": 15,
          },
        },
        {
          "contextEnd": {
            "line": 6,
            "offset": 30,
          },
          "contextStart": {
            "line": 6,
            "offset": 16,
          },
          "end": {
            "line": 6,
            "offset": 22,
          },
          "file": "\${testWorkspacePath}/ts-template-imports-app/src/empty-fixture.gts",
          "isDefinition": true,
          "isWriteAccess": true,
          "lineText": "    <Greeting @target="World" />",
          "start": {
            "line": 6,
            "offset": 16,
          },
        },
      ]
    `);
  });
});

async function requestReferences(fileName: string, languageId: string, contentWithCursor: string) {
  const [offset, content] = extractCursor(contentWithCursor);

  let document = await prepareDocument(fileName, languageId, content);

  const res = await performReferencesRequest(document, offset);

  return res;
}

async function performReferencesRequest(document: TextDocument, offset: number) {
  const workspaceHelper = await getSharedTestWorkspaceHelper();

  const res = await workspaceHelper.tsserver.message({
    seq: workspaceHelper.nextSeq(),
    command: 'references',
    arguments: {
      file: URI.parse(document.uri).fsPath,
      position: offset,
			includeDeclaration: false,
    },
  });
  expect(res.success).toBe(true);

  for (const ref of res.body.refs) {
    ref.file = '${testWorkspacePath}' + ref.file.slice(testWorkspacePath.length);
  }
  return res.body.refs;
}
