import { Project } from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';
import { CompletionItemKind, Position } from '@volar/language-server';

describe('Language Server: Completions', () => {
  let project!: Project;

  beforeEach(async () => {
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test.skip('querying a standalone template', async () => {
    project.setGlintConfig({ environment: 'ember-loose' });
    project.write('index.hbs', '<LinkT />');

    let server = await project.startLanguageServer();
    let completions = server.getCompletions(project.fileURI('index.hbs'), {
      line: 0,
      character: 6,
    });

    let completion = completions?.find((item) => item.label === 'LinkTo');

    expect(completion?.kind).toEqual(CompletionItemKind.Field);

    let details = server.getCompletionDetails(completion!);

    expect(details.detail).toEqual('(property) Globals.LinkTo: LinkToComponent');
  });

  test('in unstructured text', async () => {
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

    let server = await project.startLanguageServer();
    const { uri } = await server.openTextDocument(project.filePath('index.gts'), 'glimmer-ts');
    let completions = await server.sendCompletionRequest(uri, Position.create(4, 4));

    expect(completions!.items).toEqual([]);
  });

  test.skip('in a companion template with syntax errors', async () => {
    project.setGlintConfig({ environment: 'ember-loose' });

    let code = stripIndent`
      Hello, {{this.target.}}!
    `;

    project.write('index.hbs', code);

    let server = await project.startLanguageServer();
    let completions = server.getCompletions(project.fileURI('index.hbs'), {
      line: 0,
      character: 4,
    });

    // Ensure we don't spew all ~900 completions available at the top level
    // in module scope in a JS/TS file.
    expect(completions).toBeUndefined();
  });

  test('in an embedded template with syntax errors', async () => {
    project.setGlintConfig({ environment: 'ember-template-imports' });

    let code = stripIndent`
      <template>Hello, {{this.target.}}!</template>
    `;

    project.write('index.gts', code);

    let server = await project.startLanguageServer();

    const { uri } = await server.openTextDocument(project.filePath('index.gts'), 'glimmer-ts');
    let completions = await server.sendCompletionRequest(uri, Position.create(0, 31));

    // Ensure we don't spew all ~900 completions available at the top level
    // in module scope in a JS/TS file.
    expect(completions!.items).toEqual([]);
  });

  test('passing component args', async () => {
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

    let server = await project.startLanguageServer();

    const { uri } = await server.openTextDocument(project.filePath('index.gts'), 'glimmer-ts');
    let completions = await server.sendCompletionRequest(uri, Position.create(4, 12));

    let labels = completions!.items.map((completion) => completion.label);
    expect(new Set(labels)).toEqual(new Set(['foo?', 'bar-baz?']));

    let completion = completions!.items.find((c) => c.label === 'bar-baz?');
    let details = await server.sendCompletionResolveRequest(completion!);

    expect(details.detail).toEqual("(property) 'bar-baz'?: number | undefined");
  });

  test('referencing class properties', async () => {
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

    let server = await project.startLanguageServer();
    const { uri } = await server.openTextDocument(project.filePath('index.gts'), 'glimmer-ts');
    let completions = await server.sendCompletionRequest(uri, Position.create(6, 13));

    let messageCompletion = completions?.items.find((item) => item.label === 'message');

    expect(messageCompletion?.kind).toEqual(CompletionItemKind.Field);

    let details = await server.sendCompletionResolveRequest(messageCompletion!);

    expect(details.detail).toEqual('(property) MyComponent.message: string');
  });

  test('auto imports', async () => {
    project.write({
      'other.ts': stripIndent`
        export let foobar = 123;
      `,
      'index.ts': stripIndent`
        import { thing } from 'nonexistent';

        let a = foo
      `,
    });

    let server = await project.startLanguageServer();
    let completions = await server.sendCompletionRequest(project.fileURI('index.ts'), {
      line: 2,
      character: 11,
    });

    let importCompletion = completions?.items.find(
      (k) => k.kind == CompletionItemKind.Variable && k.label == 'foobar'
    );

    let details = await server.sendCompletionResolveRequest(importCompletion!);

    expect(details.detail).toMatchInlineSnapshot(`
      "Add import from "./other"
      let foobar: number"
    `);

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

  test('auto imports with documentation and tags', async () => {
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

    let server = await project.startLanguageServer();
    const { uri } = await server.openTextDocument(project.filePath('index.ts'), 'typescript');
    let completions = await server.sendCompletionRequest(uri, Position.create(2, 11));
    let importCompletion = completions?.items.find(
      (k) => k.kind == CompletionItemKind.Variable && k.label == 'foobar'
    );
    let details = await server.sendCompletionResolveRequest(importCompletion!);

    expect(details.detail).toMatchInlineSnapshot(`
      "Add import from "./other"
      let foobar: number"
    `);
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

  test('auto import - import statements - ensure all completions are resolvable', async () => {
    project.write({
      'other.ts': stripIndent`
        export let foobar = 123;
      `,
      'index.ts': stripIndent`
        import foo
      `,
    });

    let server = await project.startLanguageServer();
    let completions = await server.sendCompletionRequest(
      project.fileURI('index.ts'),
      Position.create(0, 10)
    );

    for (const completion of completions!.items) {
      let details = await server.sendCompletionResolveRequest(completion);
      expect(details).toBeTruthy();
    }
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
    let server = await project.startLanguageServer();
    let completions = await server.sendCompletionRequest(project.fileURI('index.gts'), {
      line: 8,
      character: 8,
    });

    let itemsCompletion = completions?.items.find((item) => item.label === 'items');

    expect(itemsCompletion?.kind).toEqual(CompletionItemKind.Field);

    let details = await server.sendCompletionResolveRequest(itemsCompletion!);

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
    let server = await project.startLanguageServer();

    const { uri } = await server.openTextDocument(project.filePath('index.gts'), 'glimmer-ts');
    let completions = await server.sendCompletionRequest(uri, Position.create(5, 9));
    let letterCompletion = completions?.items.find((item) => item.label === 'letter');
    expect(letterCompletion?.kind).toEqual(CompletionItemKind.Variable);
    let details = await server.sendCompletionResolveRequest(letterCompletion!);
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

    let server = await project.startLanguageServer();
    const { uri } = await server.openTextDocument(project.filePath('index.ts'), 'typescript');

    let completions = await server.sendCompletionRequest(uri, Position.create(6, 7));

    let greetingCompletion = completions?.items.find((item) => item.label === 'greeting');

    expect(greetingCompletion?.kind).toEqual(CompletionItemKind.Variable);

    let details = await server.sendCompletionResolveRequest(greetingCompletion!);

    expect(details.detail).toEqual('const greeting: string');
  });

  test.only('immediately after a change', async () => {
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

    let server = await project.startLanguageServer();

    const { uri } = await server.openTextDocument(project.filePath('index.ts'), 'typescript');
    await server.replaceTextDocument(project.fileURI('index.gts'), code.replace('{{}}', '{{l}}'));

    let completions = await server.sendCompletionRequest(uri, Position.create(5, 9));
    let letterCompletion = completions?.items.find((item) => item.label === 'letter');
    expect(letterCompletion?.kind).toEqual(CompletionItemKind.Variable);
    let details = await server.sendCompletionResolveRequest(letterCompletion!);
    expect(details.detail).toEqual('const letter: string');
  });
});
