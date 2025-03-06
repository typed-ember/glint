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

describe('Language Server: Definitions (ts plugin)', () => {
  afterEach(teardownSharedTestWorkspaceAfterEach);

  /*
  test.skip('querying a standalone template', async () => {
    project.setGlintConfig({ environment: 'ember-loose' });
    project.write('index.hbs', '<Foo as |foo|>{{foo}}</Foo>');

    let server = await project.startLanguageServer();
    let definitions = await server.sendDefinitionRequest(project.fileURI('index.hbs'), {
      line: 0,
      character: 17,
    });

    expect(definitions).toMatchObject([
      {
        uri: project.fileURI('index.hbs'),
        range: {
          start: { line: 0, character: 9 },
          end: { line: 0, character: 12 },
        },
      },
    ]);
  });
  */

  test.only('component invocation', async () => {
    // TODO: prepareDoucment for Greeting.gts and go from there.

    expect(
      await requestDefinition(
        'ts-template-imports-app/src/FakeFileComponent.gts',
        'typescript',
        stripIndent`
        import Component from '@glimmer/component';
        import Greeting from './Greeting.gts';

        export default class Application extends Component {
          <template>
            <Gr|eeting @message="hello" />
          </template>
        }
      `,
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "contextEnd": {
            "line": 2,
            "offset": 39,
          },
          "contextStart": {
            "line": 2,
            "offset": 1,
          },
          "end": {
            "line": 2,
            "offset": 16,
          },
          "file": "\${testWorkspacePath}/ts-template-imports-app/src/FakeFileComponent.gts",
          "start": {
            "line": 2,
            "offset": 8,
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

async function requestDefinition(fileName: string, languageId: string, content: string) {
  const offset = content.indexOf('|');
  expect(offset).toBeGreaterThanOrEqual(0);
  content = content.slice(0, offset) + content.slice(offset + 1);

  const workspaceHelper = await getSharedTestWorkspaceHelper();
  let document = await prepareDocument(fileName, languageId, content);

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
    console.log(ref.file);
    ref.file = '${testWorkspacePath}' + ref.file.slice(testWorkspacePath.length);
  }

  return res.body;
}
