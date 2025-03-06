import { Project } from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';

describe('Language Server: Definitions', () => {
  let project!: Project;

  beforeEach(async () => {
    project = await Project.create();
  });

  afterEach(async () => {
    // vue takes this opportunity to close the docs on the langauge server.
    // why don't they destroy?

    // vue tests are written in such a way to reuse the vue server and tsserver.
    // we should follow along with that.
    // one way we could make that work is
    // for the Server that we return to keep track of all its open files so that
    // when we dispose it it's just doing what these other files are doing.

    // QUESTION: does have duplicate teardown fns?
    // ANSWER: YES
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
    let definitions = await server.sendDefinitionRequest(project.fileURI('index.gts'), {
      line: 5,
      character: 7,
    });

    expect(definitions).toMatchInlineSnapshot(`
      [
        {
          "range": {
            "end": {
              "character": 1,
              "line": 3,
            },
            "start": {
              "character": 0,
              "line": 1,
            },
          },
          "uri": "file:///path/to/EPHEMERAL_TEST_PROJECT/greeting.gts",
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
});
