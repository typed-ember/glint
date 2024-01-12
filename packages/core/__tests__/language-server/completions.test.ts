import { Project } from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';
import { CompletionItemKind } from 'vscode-languageserver';

describe('Language Server: Completions', () => {
  let project!: Project;

  beforeEach(async () => {
    project = await Project.create({
      compilerOptions: {
        baseUrl: '.',
      },
    });
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('querying a standalone template', () => {
    project.setGlintConfig({ environment: 'ember-loose' });
    project.write('index.hbs', '<LinkT />');

    let server = project.startLanguageServer();
    let completions = server.getCompletions(project.fileURI('index.hbs'), {
      line: 0,
      character: 6,
    });

    let completion = completions?.find((item) => item.label === 'LinkTo');

    expect(completion?.kind).toEqual(CompletionItemKind.Field);

    let details = server.getCompletionDetails(completion!);

    expect(details.detail).toEqual('(property) Globals.LinkTo: LinkToComponent');
  });

  test('in unstructured text', () => {
    let code = stripIndent`
      import Component, { hbs } from '@glimmerx/component';

      export default class MyComponent extends Component {
        static template = hbs\`
          <div>
            hello
          </div>
        \`;
      }
    `;

    project.write('index.ts', code);

    let server = project.startLanguageServer();
    let completions = server.getCompletions(project.fileURI('index.ts'), {
      line: 4,
      character: 4,
    });

    expect(completions).toBeUndefined();
  });

  test('in a companion template with syntax errors', () => {
    project.setGlintConfig({ environment: 'ember-loose' });

    let code = stripIndent`
      Hello, {{this.target.}}!
    `;

    project.write('index.hbs', code);

    let server = project.startLanguageServer();
    let completions = server.getCompletions(project.fileURI('index.hbs'), {
      line: 0,
      character: 4,
    });

    // Ensure we don't spew all ~900 completions available at the top level
    // in module scope in a JS/TS file.
    expect(completions).toBeUndefined();
  });

  test('in an embedded template with syntax errors', () => {
    project.setGlintConfig({ environment: 'ember-template-imports' });

    let code = stripIndent`
      <template>Hello, {{this.target.}}!</template>
    `;

    project.write('index.gts', code);

    let server = project.startLanguageServer();
    let completions = server.getCompletions(project.fileURI('index.gts'), {
      line: 0,
      character: 31,
    });

    // Ensure we don't spew all ~900 completions available at the top level
    // in module scope in a JS/TS file.
    expect(completions).toBeUndefined();
  });

  test('passing component args', () => {
    let code = stripIndent`
      import Component, { hbs } from '@glimmerx/component';

      export default class MyComponent extends Component {
        static template = hbs\`
          <Inner @ />
        \`;
      }

      class Inner extends Component<{ Args: { foo?: string; 'bar-baz'?: number | undefined } }> {}
    `;

    project.write('index.ts', code);

    let server = project.startLanguageServer();
    let completions = server.getCompletions(project.fileURI('index.ts'), {
      line: 4,
      character: 12,
    });

    let labels = completions?.map((completion) => completion.label);
    expect(new Set(labels)).toEqual(new Set(['foo', 'bar-baz']));

    let details = server.getCompletionDetails(completions!.find((c) => c.label === 'bar-baz')!);
    expect(details.detail).toEqual("(property) 'bar-baz'?: number | undefined");
  });

  test('referencing class properties', () => {
    let code = stripIndent`
      import Component, { hbs } from '@glimmerx/component';

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

  test('auto imports', () => {
    project.write({
      'other.ts': stripIndent`
        export let foobar = 123;
      `,
      'index.ts': stripIndent`
        import { thing } from 'nonexistent';

        let a = foo
      `,
    });

    const preferences = {
      includeCompletionsForModuleExports: true,
      allowIncompleteCompletions: true,
    };

    let server = project.startLanguageServer();
    let completions = server.getCompletions(
      project.fileURI('index.ts'),
      {
        line: 2,
        character: 11,
      },
      {},
      preferences
    );

    let importCompletion = completions?.find(
      (k) => k.kind == CompletionItemKind.Variable && k.label == 'foobar'
    );

    let details = server.getCompletionDetails(importCompletion!, {}, preferences);

    expect(details.detail).toEqual('let foobar: number');

    expect(details.additionalTextEdits?.length).toEqual(1);
    expect(details.additionalTextEdits?.[0].newText).toMatch("import { foobar } from 'other';");
    expect(details.additionalTextEdits?.[0].range).toEqual({
      start: { line: 1, character: 0 },
      end: { line: 1, character: 0 },
    });
    expect(details?.documentation).toEqual({
      kind: 'markdown',
      value: 'Add import from "other"\n\n',
    });
  });

  test('auto imports with documentation and tags', () => {
    project.write({
      'other.ts': stripIndent`
        /**
         * This is a doc comment
         * @param foo
         */
        export let foobar = 123;
      `,
      'index.ts': stripIndent`
        import { thing } from 'nonexistent';

        let a = foo
      `,
    });

    const preferences = {
      includeCompletionsForModuleExports: true,
      allowIncompleteCompletions: true,
    };

    let server = project.startLanguageServer();
    let completions = server.getCompletions(
      project.fileURI('index.ts'),
      {
        line: 2,
        character: 11,
      },
      {},
      preferences
    );

    let importCompletion = completions?.find(
      (k) => k.kind == CompletionItemKind.Variable && k.label == 'foobar'
    );

    let details = server.getCompletionDetails(importCompletion!, {}, preferences);

    expect(details.detail).toEqual('let foobar: number');

    expect(details.additionalTextEdits?.length).toEqual(1);
    expect(details.additionalTextEdits?.[0].newText).toMatch("import { foobar } from 'other';");
    expect(details.additionalTextEdits?.[0].range).toEqual({
      start: { line: 1, character: 0 },
      end: { line: 1, character: 0 },
    });
    expect(details?.documentation).toEqual({
      kind: 'markdown',
      value: 'This is a doc comment\n\n*@param* `foo`\n\nAdd import from "other"\n\n',
    });
  });

  test('referencing own args', async () => {
    let code = stripIndent`
      import Component, { hbs } from '@glimmerx/component';

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
      import Component, { hbs } from '@glimmerx/component';

      export default class MyComponent extends Component {
        static template = hbs\`
          {{#each "abc" as |letter|}}
            {{l}}
          {{/each}}
        \`;
      }
    `;

    project.write('index.ts', code);

    let server = project.startLanguageServer();
    let completions = server.getCompletions(project.fileURI('index.ts'), {
      line: 5,
      character: 9,
    });

    let letterCompletion = completions?.find((item) => item.label === 'letter');

    expect(letterCompletion?.kind).toEqual(CompletionItemKind.Variable);

    let details = server.getCompletionDetails(letterCompletion!);

    expect(details.detail).toEqual('const letter: string');
  });

  test('referencing module-scope identifiers', async () => {
    let code = stripIndent`
      import Component, { hbs } from '@glimmerx/component';

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
          {{#each "abc" as |letter|}}
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
      character: 9,
    });

    let letterCompletion = completions?.find((item) => item.label === 'letter');

    expect(letterCompletion?.kind).toEqual(CompletionItemKind.Variable);

    let details = server.getCompletionDetails(letterCompletion!);

    expect(details.detail).toEqual('const letter: string');
  });
});
