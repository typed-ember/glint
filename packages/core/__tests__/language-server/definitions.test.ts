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

  test('querying a standalone template', () => {
    project.setGlintConfig({ environment: 'ember-loose' });
    project.write('index.hbs', '<Foo as |foo|>{{foo}}</Foo>');

    let server = project.startLanguageServer();
    let definitions = server.getDefinition(project.fileURI('index.hbs'), {
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

  test('component invocation', () => {
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

    let server = project.startLanguageServer();
    let definitions = server.getDefinition(project.fileURI('index.gts'), {
      line: 5,
      character: 7,
    });

    expect(definitions).toEqual([
      {
        uri: project.fileURI('greeting.gts'),
        range: {
          start: { line: 1, character: 21 },
          end: { line: 1, character: 29 },
        },
      },
    ]);
  });

  test('arg passing', () => {
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

    let server = project.startLanguageServer();
    let definitions = server.getDefinition(project.fileURI('index.gts'), {
      line: 5,
      character: 17,
    });

    expect(definitions).toEqual([
      {
        uri: project.fileURI('greeting.gts'),
        range: {
          start: { line: 3, character: 2 },
          end: { line: 3, character: 9 },
        },
      },
    ]);
  });

  // TODO: skipped because .gts files might not fully support this yet
  test.skip('arg use', () => {
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

    let server = project.startLanguageServer();
    let definitions = server.getDefinition(project.fileURI('greeting.gts'), {
      line: 7,
      character: 30,
    });

    expect(definitions).toEqual([
      {
        uri: project.fileURI('greeting.gts'),
        range: {
          start: { line: 3, character: 2 },
          end: { line: 3, character: 9 },
        },
      },
    ]);
  });

  test('import source', () => {
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

    let server = project.startLanguageServer();
    let definitions = server.getDefinition(project.fileURI('index.gts'), {
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
