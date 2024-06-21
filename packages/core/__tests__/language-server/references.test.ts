import { Project } from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';

describe('Language Server: References', () => {
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
    let references = await server.sendReferencesRequest(
      project.fileURI('index.hbs'),
      {
        line: 0,
        character: 11,
      },
      {
        includeDeclaration: true,
      }
    );

    expect(references).toEqual([
      {
        uri: project.fileURI('index.hbs'),
        range: {
          start: { line: 0, character: 9 },
          end: { line: 0, character: 12 },
        },
      },
      {
        uri: project.fileURI('index.hbs'),
        range: {
          start: { line: 0, character: 16 },
          end: { line: 0, character: 19 },
        },
      },
    ]);
  });

  test('component references', async () => {
    project.write({
      'greeting.gts': stripIndent`
        import Component from '@glimmer/component';

        export default class Greeting extends Component {
          private nested = Math.random() > 0.5;

          <template>
            {{#if this.nested}}
              <Greeting />!
            {{else}}
              Hello!
            {{/if}}
          </template>
        }
      `,
      'index.gts': stripIndent`
        import Component from '@glimmer/component';
        import Greeting from './greeting';

        export default class Application extends Component {
          <template>
            <Greeting />
          </template>
        }
      `,
    });

    let server = await project.startLanguageServer();
    let expectedReferences = new Set([
      {
        uri: project.fileURI('greeting.gts'),
        range: {
          start: { line: 2, character: 21 },
          end: { line: 2, character: 29 },
        },
      },
      {
        uri: project.fileURI('greeting.gts'),
        range: {
          start: { line: 7, character: 7 },
          end: { line: 7, character: 15 },
        },
      },
      {
        uri: project.fileURI('index.gts'),
        range: {
          start: { line: 5, character: 5 },
          end: { line: 5, character: 13 },
        },
      },
      {
        uri: project.fileURI('index.gts'),
        range: {
          start: { line: 1, character: 7 },
          end: { line: 1, character: 15 },
        },
      },
    ]);

    let referencesFromClassDeclaration = await server.sendReferencesRequest(
      project.fileURI('greeting.gts'),
      {
        line: 2,
        character: 24,
      },
      {
        includeDeclaration: true,
      }
    );

    expect(new Set(referencesFromClassDeclaration)).toEqual(expectedReferences);

    let referencesFromComponentInvocation = await server.sendReferencesRequest(
      project.fileURI('index.gts'),
      {
        line: 5,
        character: 7,
      },
      {
        includeDeclaration: true,
      }
    );

    expect(new Set(referencesFromComponentInvocation)).toEqual(expectedReferences);
  });

  test('arg references', async () => {
    project.write({
      'greeting.gts': stripIndent`
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
      'index.gts': stripIndent`
        import Component from '@glimmer/component';
        import Greeting from './greeting';

        export default class Application extends Component {
          <template>
            <Greeting @target="World" />
          </template>
        }
      `,
    });

    let server = await project.startLanguageServer();
    let expectedReferences = new Set([
      {
        uri: project.fileURI('index.gts'),
        range: {
          start: { line: 5, character: 14 },
          end: { line: 5, character: 21 },
        },
      },
      {
        uri: project.fileURI('greeting.gts'),
        range: {
          start: { line: 9, character: 14 },
          end: { line: 9, character: 20 },
        },
      },
      {
        uri: project.fileURI('greeting.gts'),
        range: {
          start: { line: 4, character: 2 },
          end: { line: 4, character: 8 },
        },
      },
    ]);

    let referencesFromDefinition = await server.sendReferencesRequest(
      project.fileURI('greeting.gts'),
      {
        line: 4,
        character: 4,
      },
      {
        includeDeclaration: true,
      }
    );

    expect(new Set(referencesFromDefinition)).toEqual(expectedReferences);

    let referencesFromInvocation = await server.sendReferencesRequest(
      project.fileURI('index.gts'),
      {
        line: 5,
        character: 17,
      },
      {
        includeDeclaration: true,
      }
    );

    expect(new Set(referencesFromInvocation)).toEqual(expectedReferences);

    let referencesFromUsage = await server.sendReferencesRequest(
      project.fileURI('greeting.gts'),
      {
        line: 9,
        character: 16,
      },
      {
        includeDeclaration: true,
      }
    );

    expect(new Set(referencesFromUsage)).toEqual(expectedReferences);
  });
});
