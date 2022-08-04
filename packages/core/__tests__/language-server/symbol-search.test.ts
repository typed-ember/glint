import Project from '../utils/project';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';
import { SymbolKind } from 'vscode-languageserver-types';

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
      'greeting.ts': stripIndent`
        import Component, { hbs } from '@glint/environment-glimmerx/component';

        export type GreetingArgs = {
          message: string;
        };

        export default class Greeting extends Component<{ Args: GreetingArgs }> {
          static template = hbs\`{{@message}}, World!\`;
        }
      `,
      'index.ts': stripIndent`
        import Component, { hbs } from '@glint/environment-glimmerx/component';
        import Greeting from './greeting';

        export class Application extends Component {
          static template = hbs\`
            <Greeting @message="Hello" />
          \`;
        }
      `,
    });

    let server = project.startLanguageServer();
    let expectedSymbols = new Set([
      {
        name: 'Greeting',
        kind: SymbolKind.Class,
        location: {
          uri: project.fileURI('greeting.ts'),
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
          uri: project.fileURI('index.ts'),
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
          uri: project.fileURI('greeting.ts'),
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
