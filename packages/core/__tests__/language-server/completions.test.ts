import Project from '../utils/project';
import { stripIndent } from 'common-tags';
import { CompletionItemKind } from 'vscode-languageserver';

describe('Language Server: Completions', () => {
  let project!: Project;

  beforeEach(async () => {
    jest.setTimeout(20_000);
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('passing component args', () => {
    let code = stripIndent`
      import Component, { hbs } from '@glint/environment-glimmerx/component';

      export default class MyComponent extends Component {
        static template = hbs\`
          <Inner @ />
        \`;
      }

      class Inner extends Component<{ Args: { foo?: string; 'bar-baz'?: number } }> {}
    `;

    project.write('index.ts', code);

    let server = project.startLanguageServer();
    let completions = server.getCompletions(project.fileURI('index.ts'), {
      line: 4,
      character: 12,
    });

    expect(completions).toMatchObject([
      {
        kind: CompletionItemKind.Field,
        label: 'foo',
      },
      {
        kind: CompletionItemKind.Field,
        label: 'bar-baz',
      },
    ]);

    let details = server.getCompletionDetails(completions![1]);

    expect(details.detail).toEqual("(property) 'bar-baz'?: number | undefined");
  });

  test('referencing class properties', () => {
    let code = stripIndent`
      import Component, { hbs } from '@glint/environment-glimmerx/component';

      export default class MyComponent extends Component {
        private message = 'hello';

        static template = hbs\`
          {{this.me}}
        \`;
      }
    `;

    project.write('index.ts', code);

    let server = project.startLanguageServer();
    let completions = server.getCompletions(project.fileURI('index.ts'), {
      line: 6,
      character: 13,
    });

    let messageCompletion = completions?.find((item) => item.label === 'message');

    expect(messageCompletion?.kind).toEqual(CompletionItemKind.Field);

    let details = server.getCompletionDetails(messageCompletion!);

    expect(details.detail).toEqual('(property) MyComponent.message: string');
  });

  test('referencing own args', async () => {
    let code = stripIndent`
      import Component, { hbs } from '@glint/environment-glimmerx/component';

      type MyComponentArgs<T> = {
        items: Set<T>;
      };

      export default class MyComponent<T> extends Component<{ Args: MyComponentArgs<T> }> {
        static template = hbs\`
          {{@i}}
        \`;
      }
    `;

    project.write('index.ts', code);

    let server = project.startLanguageServer();
    let completions = server.getCompletions(project.fileURI('index.ts'), {
      line: 8,
      character: 8,
    });

    let itemsCompletion = completions?.find((item) => item.label === 'items');

    expect(itemsCompletion?.kind).toEqual(CompletionItemKind.Field);

    let details = server.getCompletionDetails(itemsCompletion!);

    expect(details.detail).toEqual('(property) items: Set<T>');
  });

  test('referencing block params', async () => {
    let code = stripIndent`
      import Component, { hbs } from '@glint/environment-glimmerx/component';

      export default class MyComponent extends Component {
        static template = hbs\`
          {{#each (array "a" "b" "c") as |letter|}}
            {{l}}
          {{/each}}
        \`;
      }
    `;

    project.write('index.ts', code);

    let server = project.startLanguageServer();
    let completions = server.getCompletions(project.fileURI('index.ts'), {
      line: 5,
      character: 7,
    });

    let letterCompletion = completions?.find((item) => item.label === 'letter');

    expect(letterCompletion?.kind).toEqual(CompletionItemKind.Variable);

    let details = server.getCompletionDetails(letterCompletion!);

    expect(details.detail).toEqual('(parameter) letter: string');
  });

  test('referencing module-scope identifiers', async () => {
    let code = stripIndent`
      import Component, { hbs } from '@glint/environment-glimmerx/component';

      const greeting: string = 'hello';

      export default class MyComponent extends Component {
        static template = hbs\`
          {{g}}
        \`;
      }
    `;

    project.write('index.ts', code);

    let server = project.startLanguageServer();
    let completions = server.getCompletions(project.fileURI('index.ts'), {
      line: 6,
      character: 7,
    });

    let greetingCompletion = completions?.find((item) => item.label === 'greeting');

    expect(greetingCompletion?.kind).toEqual(CompletionItemKind.Variable);

    let details = server.getCompletionDetails(greetingCompletion!);

    expect(details.detail).toEqual('const greeting: string');
  });

  test('immediately after a change', () => {
    let code = stripIndent`
      import Component, { hbs } from '@glimmerx/component';

      export default class MyComponent<T> extends Component {
        static template = hbs\`
          {{#each (array "a" "b" "c") as |letter|}}
            {{}}
          {{/each}}
        \`;
      }
    `;

    project.write('index.ts', code);

    let server = project.startLanguageServer();

    server.updateFile(project.fileURI('index.ts'), code.replace('{{}}', '{{l}}'));

    let completions = server.getCompletions(project.fileURI('index.ts'), {
      line: 5,
      character: 7,
    });

    let letterCompletion = completions?.find((item) => item.label === 'letter');

    expect(letterCompletion?.kind).toEqual(CompletionItemKind.Variable);

    let details = server.getCompletionDetails(letterCompletion!);

    expect(details.detail).toEqual('(parameter) letter: string');
  });
});
