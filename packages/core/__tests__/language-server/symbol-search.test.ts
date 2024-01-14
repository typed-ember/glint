import { Project } from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';
import { SymbolKind } from '@volar/language-server';

describe('Language Server: Symbol Search', () => {
  let project!: Project;

  beforeEach(async () => {
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('component definition', () => {
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
    let expectedSymbols = new Set([
      {
        name: 'Greeting',
        kind: SymbolKind.Class,
        location: {
          uri: project.fileURI('greeting.gts'),
          range: {
            start: { line: 6, character: 0 },
            end: { line: 8, character: 1 },
          },
        },
      },
      {
        name: 'Greeting',
        kind: SymbolKind.Variable,
        location: {
          uri: project.fileURI('index.gts'),
          range: {
            start: { line: 1, character: 7 },
            end: { line: 1, character: 15 },
          },
        },
      },
      {
        name: 'GreetingArgs',
        kind: SymbolKind.Variable,
        location: {
          uri: project.fileURI('greeting.gts'),
          range: {
            start: { line: 2, character: 0 },
            end: { line: 4, character: 2 },
          },
        },
      },
    ]);

    expect(new Set(server.findSymbols('greeting'))).toEqual(expectedSymbols);
  });
});
