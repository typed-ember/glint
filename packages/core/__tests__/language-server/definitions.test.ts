import { Project } from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';

describe('Language Server: Definitions', () => {
  let project!: Project;

  beforeEach(async () => {
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

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

  test('component invocation', async () => {
    project.write({
      'greeting.gts': stripIndent`
        import Component from '@glimmer/component';
        export default class Greeting extends Component<{ Args: { message: string } }> {
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
    let definitions = await server.sendDefinitionRequestNormalized(project.fileURI('index.gts'), {
      line: 5,
      character: 7,
    });

    expect(definitions).toMatchInlineSnapshot(`
      [
        {
          "originSelectionRange": {
            "end": {
              "character": 13,
              "line": 5,
            },
            "start": {
              "character": 5,
              "line": 5,
            },
          },
          "targetRange": {
            "end": {
              "character": 1,
              "line": 3,
            },
            "start": {
              "character": 0,
              "line": 1,
            },
          },
          "targetSelectionRange": {
            "end": {
              "character": 29,
              "line": 1,
            },
            "start": {
              "character": 21,
              "line": 1,
            },
          },
          "targetUri": "file:///PATH_TO_EPHEMERAL_TEST_PROJECT/greeting.gts",
        },
      ]
    `);
  });

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
    let definitions = await server.sendDefinitionRequestNormalized(project.fileURI('index.gts'), {
      line: 5,
      character: 17,
    });

    expect(definitions).toMatchInlineSnapshot(`
      [
        {
          "originSelectionRange": {
            "end": {
              "character": 22,
              "line": 5,
            },
            "start": {
              "character": 14,
              "line": 5,
            },
          },
          "targetRange": {
            "end": {
              "character": 18,
              "line": 3,
            },
            "start": {
              "character": 2,
              "line": 3,
            },
          },
          "targetSelectionRange": {
            "end": {
              "character": 9,
              "line": 3,
            },
            "start": {
              "character": 2,
              "line": 3,
            },
          },
          "targetUri": "file:///PATH_TO_EPHEMERAL_TEST_PROJECT/greeting.gts",
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
    let definitions = await server.sendDefinitionRequestNormalized(project.fileURI('greeting.gts'), {
      line: 7,
      character: 18,
    });

    expect(definitions).toMatchInlineSnapshot(`
      [
        {
          "originSelectionRange": {
            "end": {
              "character": 22,
              "line": 7,
            },
            "start": {
              "character": 15,
              "line": 7,
            },
          },
          "targetRange": {
            "end": {
              "character": 18,
              "line": 3,
            },
            "start": {
              "character": 2,
              "line": 3,
            },
          },
          "targetSelectionRange": {
            "end": {
              "character": 9,
              "line": 3,
            },
            "start": {
              "character": 2,
              "line": 3,
            },
          },
          "targetUri": "file:///PATH_TO_EPHEMERAL_TEST_PROJECT/greeting.gts",
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

    expect(definitions).toMatchObject([
      {
        uri: project.fileURI('greeting.gts'),

        // Versions of TS vary on whether they consider the source to be
        // the entire module or just the first character, so we'll consider
        // the test passing as long as the loose shape is right.
        range: {
          start: { line: 0, character: 0 },
          end: {},
        },
      },
    ]);
  });
});
