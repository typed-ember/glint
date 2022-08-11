import Project from '../utils/project';
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

  test('querying a standalone template', () => {
    project.setGlintConfig({ environment: 'ember-loose' });
    project.write('index.hbs', '<Foo as |foo|>{{foo}}</Foo>');

    let server = project.startLanguageServer();
    let references = server.getReferences(project.fileURI('index.hbs'), {
      line: 0,
      character: 11,
    });

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

  test('component references', () => {
    project.write({
      'greeting.ts': stripIndent`
        import Component, { hbs } from '@glimmerx/component';

        export default class Greeting extends Component {
          private nested = Math.random() > 0.5;

          static template = hbs\`
            {{#if this.nested}}
              <Greeting />!
            {{else}}
              Hello!
            {{/if}}
          \`;
        }
      `,
      'index.ts': stripIndent`
        import Component, { hbs } from '@glimmerx/component';
        import Greeting from './greeting';

        export default class Application extends Component {
          static template = hbs\`
            <Greeting />
          \`;
        }
      `,
    });

    let server = project.startLanguageServer();
    let expectedReferences = new Set([
      {
        uri: project.fileURI('greeting.ts'),
        range: {
          start: { line: 2, character: 21 },
          end: { line: 2, character: 29 },
        },
      },
      {
        uri: project.fileURI('greeting.ts'),
        range: {
          start: { line: 7, character: 7 },
          end: { line: 7, character: 15 },
        },
      },
      {
        uri: project.fileURI('index.ts'),
        range: {
          start: { line: 5, character: 5 },
          end: { line: 5, character: 13 },
        },
      },
      {
        uri: project.fileURI('index.ts'),
        range: {
          start: { line: 1, character: 7 },
          end: { line: 1, character: 15 },
        },
      },
    ]);

    let referencesFromClassDeclaration = server.getReferences(project.fileURI('greeting.ts'), {
      line: 2,
      character: 24,
    });

    expect(new Set(referencesFromClassDeclaration)).toEqual(expectedReferences);

    let referencesFromComponentInvocation = server.getReferences(project.fileURI('index.ts'), {
      line: 5,
      character: 7,
    });

    expect(new Set(referencesFromComponentInvocation)).toEqual(expectedReferences);
  });

  test('arg references', async () => {
    project.write({
      'greeting.ts': stripIndent`
        import Component, { hbs } from '@glimmerx/component';

        export type GreetingArgs = {
          /** Who to greet */
          target: string;
        };

        export default class Greeting extends Component<{ Args: GreetingArgs }> {
          static template = hbs\`
            Hello, {{@target}}
          \`;
        }
      `,
      'index.ts': stripIndent`
        import Component, { hbs } from '@glimmerx/component';
        import Greeting from './greeting';

        export default class Application extends Component {
          static template = hbs\`
            <Greeting @target="World" />
          \`;
        }
      `,
    });

    let server = project.startLanguageServer();
    let expectedReferences = new Set([
      {
        uri: project.fileURI('index.ts'),
        range: {
          start: { line: 5, character: 15 },
          end: { line: 5, character: 21 },
        },
      },
      {
        uri: project.fileURI('greeting.ts'),
        range: {
          start: { line: 9, character: 14 },
          end: { line: 9, character: 20 },
        },
      },
      {
        uri: project.fileURI('greeting.ts'),
        range: {
          start: { line: 4, character: 2 },
          end: { line: 4, character: 8 },
        },
      },
    ]);

    let referencesFromDefinition = server.getReferences(project.fileURI('greeting.ts'), {
      line: 4,
      character: 4,
    });

    expect(new Set(referencesFromDefinition)).toEqual(expectedReferences);

    let referencesFromInvocation = server.getReferences(project.fileURI('index.ts'), {
      line: 5,
      character: 17,
    });

    expect(new Set(referencesFromInvocation)).toEqual(expectedReferences);

    let referencesFromUsage = server.getReferences(project.fileURI('greeting.ts'), {
      line: 9,
      character: 16,
    });

    expect(new Set(referencesFromUsage)).toEqual(expectedReferences);
  });
});
