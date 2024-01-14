import { Project } from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';
import { CompletionItemKind } from '@volar/language-server';

describe('Language Server: Completions', () => {
  let project!: Project;

  beforeEach(async () => {
    project = await Project.create();
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
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        <template>
          <div>
            hello
          </div>
        </template>
      }
    `;

    project.write('index.gts', code);

    let server = project.startLanguageServer();
    let completions = server.getCompletions(project.fileURI('index.gts'), {
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
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        <template>
          <Inner @ />
        </template>
      }

      class Inner extends Component<{ Args: { foo?: string; 'bar-baz'?: number | undefined } }> {}
    `;

    project.write('index.gts', code);

    let server = project.startLanguageServer();
    let completions = server.getCompletions(project.fileURI('index.gts'), {
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
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        private message = 'hello';

        <template>
          {{this.me}}
        </template>
      }
    `;

    project.write('index.gts', code);

    let server = project.startLanguageServer();
    let completions = server.getCompletions(project.fileURI('index.gts'), {
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

    expect(details.detail).toEqual('Add import from "./other"\n\nlet foobar: number');

    expect(details.additionalTextEdits?.length).toEqual(1);
    expect(details.additionalTextEdits?.[0].newText).toMatch("import { foobar } from './other';");
    expect(details.additionalTextEdits?.[0].range).toEqual({
      start: { line: 1, character: 0 },
      end: { line: 1, character: 0 },
    });
    expect(details?.documentation).toEqual({
      kind: 'markdown',
      value: '',
    });
    expect(details?.labelDetails?.description).toEqual('./other');
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

    expect(details.detail).toEqual('Add import from "./other"\n\nlet foobar: number');

    expect(details.additionalTextEdits?.length).toEqual(1);
    expect(details.additionalTextEdits?.[0].newText).toMatch("import { foobar } from './other';");
    expect(details.additionalTextEdits?.[0].range).toEqual({
      start: { line: 1, character: 0 },
      end: { line: 1, character: 0 },
    });
    expect(details?.documentation).toEqual({
      kind: 'markdown',
      value: 'This is a doc comment\n\n*@param* `foo`',
    });
  });

  test('auto import - import statements - ensure all completions are resolvable', () => {
    project.write({
      'other.ts': stripIndent`
        export let foobar = 123;
      `,
      'index.ts': stripIndent`
        import foo
      `,
    });

    const preferences = {
      includeCompletionsForModuleExports: true,
      allowIncompleteCompletions: true,
      includeCompletionsForImportStatements: true,
      includeCompletionsWithInsertText: true, // needs to be present for `includeCompletionsForImportStatements` to work
    };

    let server = project.startLanguageServer();
    let completions = server.getCompletions(
      project.fileURI('index.ts'),
      {
        line: 0,
        character: 10,
      },
      {},
      preferences
    );

    completions?.forEach((completion) => {
      let details = server.getCompletionDetails(completion, {}, preferences);
      expect(details).toBeTruthy();
    });
  });

  test('referencing own args', async () => {
    let code = stripIndent`
      import Component from '@glimmer/component';

      type MyComponentArgs<T> = {
        items: Set<T>;
      };

      export default class MyComponent<T> extends Component<{ Args: MyComponentArgs<T> }> {
        <template>
          {{@i}}
        </template>
      }
    `;

    project.write('index.gts', code);

    let server = project.startLanguageServer();
    let completions = server.getCompletions(project.fileURI('index.gts'), {
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
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        <template>
          {{#each "abc" as |letter|}}
            {{l}}
          {{/each}}
        </template>
      }
    `;

    project.write('index.gts', code);

    let server = project.startLanguageServer();
    let completions = server.getCompletions(project.fileURI('index.gts'), {
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
      import Component from '@glimmer/component';

      const greeting: string = 'hello';

      export default class MyComponent extends Component {
        <template>
          {{g}}
        </template>
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
      import Component from '@glimmer/component';

      export default class MyComponent<T> extends Component {
        <template>
          {{#each "abc" as |letter|}}
            {{}}
          {{/each}}
        </template>
      }
    `;

    project.write('index.gts', code);

    let server = project.startLanguageServer();

    server.updateFile(project.fileURI('index.gts'), code.replace('{{}}', '{{l}}'));

    let completions = server.getCompletions(project.fileURI('index.gts'), {
      line: 5,
      character: 9,
    });

    let letterCompletion = completions?.find((item) => item.label === 'letter');

    expect(letterCompletion?.kind).toEqual(CompletionItemKind.Variable);

    let details = server.getCompletionDetails(letterCompletion!);

    expect(details.detail).toEqual('const letter: string');
  });
});
