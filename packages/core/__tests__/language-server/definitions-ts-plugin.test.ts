import {
  Project,
  getSharedTestWorkspaceHelper,
  teardownSharedTestWorkspaceAfterEach,
  prepareDocument,
  testWorkspacePath,
} from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';
import { URI } from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-textdocument';

describe('Language Server: Definitions (ts plugin)', () => {
  afterEach(teardownSharedTestWorkspaceAfterEach);

  // not possible in Glint 2.
  // test('querying a standalone template');

  test.only('querying a template with a simple backing component', async () => {
    const [[blockParamOffset, valueOffset], templateContent] = extractCursors(
      stripIndent`
        <Foo as |f%oo|>{{foo}}{{this.val%ue}}</Foo>
      `,
    );

    const templateDoc = await prepareDocument(
      'ts-ember-app/app/components/ephemeral.hbs',
      'handlebars',
      templateContent,
    );

    await prepareDocument(
      'ts-ember-app/app/components/ephemeral.ts',
      'typescript',
      stripIndent`
        import Component from '@glimmer/component';

        export default class Foo extends Component {
          value = 123;
        }
      `,
    );

    expect(await performDefinitionRequest(templateDoc, blockParamOffset)).toMatchInlineSnapshot(`
      [
        {
          "end": {
            "line": 1,
            "offset": 13,
          },
          "file": "\${testWorkspacePath}/ts-ember-app/app/components/ephemeral.hbs",
          "start": {
            "line": 1,
            "offset": 10,
          },
        },
      ]
    `);

    expect(await performDefinitionRequest(templateDoc, valueOffset)).toMatchInlineSnapshot(`
      [
        {
          "contextEnd": {
            "line": 4,
            "offset": 15,
          },
          "contextStart": {
            "line": 4,
            "offset": 3,
          },
          "end": {
            "line": 4,
            "offset": 8,
          },
          "file": "\${testWorkspacePath}/ts-ember-app/app/components/ephemeral.ts",
          "start": {
            "line": 4,
            "offset": 3,
          },
        },
      ]
    `);
  });

  test('component invocation', async () => {
    expect(
      await requestDefinition(
        'ts-template-imports-app/src/ephemeral.gts',
        'typescript',
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

  /*
  test('arg passing', async () => {
    project.write({
      'greeting.gts': stripIndent`
        import Component from '@glimmer/component';

        export type GreetingArgs = {
          message: string;
        };

        export default class Greeting extends Component<{ Args: GreetingArgs }> {
          <template>{{@message}}, World!</template>
        }
      `,
      'index.gts': stripIndent`
        import Component from '@glimmer/component';
        import Greeting from './greeting';

        export default class Application extends Component {
          <template>
            <Greeting @message="hello" />
          </template>
        }
      `,
    });

    let server = await project.startLanguageServer();
    let definitions = await server.sendDefinitionRequest(project.fileURI('index.gts'), {
      line: 5,
      character: 17,
    });

    expect(definitions).toMatchInlineSnapshot(`
      [
        {
          "range": {
            "end": {
              "character": 18,
              "line": 3,
            },
            "start": {
              "character": 2,
              "line": 3,
            },
          },
          "uri": "file:///path/to/EPHEMERAL_TEST_PROJECT/greeting.gts",
        },
      ]
    `);
  });

  test('arg use', async () => {
    project.write({
      'greeting.gts': stripIndent`
        import Component from '@glimmer/component';

        export type GreetingArgs = {
          message: string;
        };

        export default class Greeting extends Component<{ Args: GreetingArgs }> {
          <template>{{@message}}, World!</template>
        }
      `,
    });

    let server = await project.startLanguageServer();
    let definitions = await server.sendDefinitionRequest(project.fileURI('greeting.gts'), {
      line: 7,
      character: 18,
    });

    expect(definitions).toMatchInlineSnapshot(`
      [
        {
          "range": {
            "end": {
              "character": 18,
              "line": 3,
            },
            "start": {
              "character": 2,
              "line": 3,
            },
          },
          "uri": "file:///path/to/EPHEMERAL_TEST_PROJECT/greeting.gts",
        },
      ]
    `);
  });

  test('import source', async () => {
    project.write({
      'greeting.gts': stripIndent`
        import Component from '@glimmer/component';

        export type GreetingArgs = {
          message: string;
        };

        export default class Greeting extends Component<{ Args: GreetingArgs }> {
          <template>{{@message}}, World!</template>
        }
      `,
      'index.gts': stripIndent`
        import Component from '@glimmer/component';
        import Greeting from './greeting';

        export class Application extends Component {
          <template>
            <Greeting @message="Hello" />
          </template>
        }
      `,
    });

    let server = await project.startLanguageServer();
    let definitions = await server.sendDefinitionRequest(project.fileURI('index.gts'), {
      line: 1,
      character: 27,
    });

    expect(definitions).toMatchInlineSnapshot(`
      [
        {
          "range": {
            "end": {
              "character": 0,
              "line": 0,
            },
            "start": {
              "character": 0,
              "line": 0,
            },
          },
          "uri": "file:///path/to/EPHEMERAL_TEST_PROJECT/greeting.gts",
        },
      ]
    `);
  });
  */
});

async function requestDefinition(fileName: string, languageId: string, contentWithCursor: string) {
  const [offset, content] = extractCursor(contentWithCursor);

  let document = await prepareDocument(fileName, languageId, content);

  const res = await performDefinitionRequest(document, offset);

  return res;
}

async function performDefinitionRequest(document: TextDocument, offset: number) {
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

function extractCursor(contentWithCursors: string): [number, string] {
  const [offsets, content] = extractCursors(contentWithCursors);
  expect(offsets.length).toEqual(1);
  const offset = offsets[0];
  return [offset, content];
}

function extractCursors(content: string): [number[], string] {
  const offsets = [];
  while (true) {
    const offset = content.indexOf('%');
    if (offset === -1) break;
    offsets.push(offset);
    content = content.slice(0, offset) + content.slice(offset + 1);
  }
  return [offsets, content];
}
