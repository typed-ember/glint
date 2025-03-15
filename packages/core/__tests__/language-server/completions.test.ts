import {
  getSharedTestWorkspaceHelper,
  teardownSharedTestWorkspaceAfterEach,
  prepareDocument,
  extractCursor,
} from 'glint-monorepo-test-utils';
import { describe, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';
import { URI } from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionItemKind, Position } from '@volar/language-server';

describe('Language Server: Completions (ts plugin)', () => {
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test.skip('querying a standalone template', async () => {
    await prepareDocument('ts-ember-app/app/components/index.hbs', 'handlebars', '<LinkT />');

    expect(
      await requestCompletion('ts-ember-app/app/components/index.hbs', 'handlebars', '<LinkT />'),
    ).toMatchInlineSnapshot();
  });

  test.skip('in unstructured text', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        <template>
          <div>
            hello
          </div>
        </template>
      }
    `;

    expect(
      await requestCompletion('ts-template-imports-app/src/index.gts', 'glimmer-ts', code),
    ).toMatchInlineSnapshot();
  });

  test.skip('in a companion template with syntax errors', async () => {
    const code = stripIndent`
      Hello, {{this.target.%}}!
    `;

    expect(
      await requestCompletion('ts-ember-app/app/components/index.hbs', 'handlebars', code),
    ).toMatchInlineSnapshot();
  });

  // Fails with "No content available", but maybe that's a perfectly fine response in this case?
  test.skip('in an embedded template with syntax errors', async () => {
    const code = stripIndent`
      <template>Hello, {{this.target.%}}!</template>
    `;

    expect(
      await requestCompletion(
        'ts-template-imports-app/src/ephemeral-index.gts',
        'glimmer-ts',
        code,
      ),
    ).toMatchInlineSnapshot();
  });

  test('passing component args', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        <template>
          <Inner @% />
        </template>
      }

      class Inner extends Component<{ Args: { foo?: string; 'bar-baz'?: number | undefined } }> {}
    `;

    expect(await requestCompletion('ts-template-imports-app/src/index.gts', 'glimmer-ts', code))
      .toMatchInlineSnapshot(`
      [
        {
          "kind": "property",
          "kindModifiers": "optional",
          "name": "bar-baz",
          "replacementSpan": {
            "end": {
              "line": 5,
              "offset": 13,
            },
            "start": {
              "line": 5,
              "offset": 13,
            },
          },
          "sortText": "11",
        },
        {
          "kind": "property",
          "kindModifiers": "optional",
          "name": "foo",
          "replacementSpan": {
            "end": {
              "line": 5,
              "offset": 13,
            },
            "start": {
              "line": 5,
              "offset": 13,
            },
          },
          "sortText": "11",
        },
      ]
    `);
  });

  test('referencing class properties', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        private message = 'hello';

        <template>
          {{this.me%}}
        </template>
      }
    `;

    expect(
      await requestCompletionItem(
        'ts-template-imports-app/src/index.gts',
        'glimmer-ts',
        code,
        'message',
      ),
    ).toMatchInlineSnapshot(`
      {
        "kind": "property",
        "kindModifiers": "private",
        "name": "message",
        "sortText": "11",
      }
    `);
  });

  // TODO: reinstate this... seems broken in the IDE as well.
  test.skip('auto imports', async () => {
    await prepareDocument(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      stripIndent`
        import Component from '@glimmer/component';

        export default class MyComponent extends Component {
          <template>
            <div>
              hello
            </div>
          </template>
        }
      `,
    );

    const completions = await requestCompletion(
      'ts-template-imports-app/src/empty-fixture2.gts',
      'glimmer-ts',
      stripIndent`
        let a = My%
      `,
    );

    let importCompletion = completions.find(
      (k: any) => k.kind == CompletionItemKind.Variable && k.name == 'foobar',
    );

    expect(importCompletion).toMatchInlineSnapshot();
  });

  test.skip('auto imports with documentation and tags', async () => {
    await prepareDocument(
      'ts-template-imports-app/src/other.ts',
      'typescript',
      stripIndent`
        /**
         * This is a doc comment
         * @param foo
         */
        export let foobar = 123;
      `,
    );

    expect(
      await requestCompletion(
        'ts-template-imports-app/src/index.ts',
        'typescript',
        stripIndent`
          import { thing } from 'nonexistent';

          let a = foo
        `,
      ),
    ).toMatchInlineSnapshot();
  });

  test.skip('auto import - import statements - ensure all completions are resolvable', async () => {
    await prepareDocument(
      'ts-template-imports-app/src/other.ts',
      'typescript',
      stripIndent`
        export let foobar = 123;
      `,
    );

    expect(
      await requestCompletion(
        'ts-template-imports-app/src/index.ts',
        'typescript',
        stripIndent`
          import foo
        `,
      ),
    ).toMatchInlineSnapshot(`
      TODO
    `);
  });

  test('referencing own args', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      type MyComponentArgs<T> = {
        items: Set<T>;
      };

      export default class MyComponent<T> extends Component<{ Args: MyComponentArgs<T> }> {
        <template>
          {{@i%}}
        </template>
      }
    `;

    expect(await requestCompletion('ts-template-imports-app/src/index.gts', 'glimmer-ts', code))
      .toMatchInlineSnapshot(`
      [
        {
          "kind": "property",
          "kindModifiers": "",
          "name": "items",
          "sortText": "11",
        },
      ]
    `);
  });

  test('referencing block params', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        <template>
          {{#each "abc" as |letter|}}
            {{l%}}
          {{/each}}
        </template>
      }
    `;

    expect(
      await requestCompletionItem(
        'ts-template-imports-app/src/index.gts',
        'glimmer-ts',
        code,
        'letter',
      ),
    ).toMatchInlineSnapshot(`
      {
        "kind": "const",
        "kindModifiers": "",
        "name": "letter",
        "sortText": "11",
      }
    `);
  });

  test('referencing module-scope identifiers', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      const greeting: string = 'hello';

      export default class MyComponent extends Component {
        <template>
          {{g%}}
        </template>
      }
    `;
    const completions = await requestCompletion(
      'ts-template-imports-app/src/index.ts',
      'typescript',
      code,
    );
    const matches = completions.filter((item: any) => item.name === 'greeting');

    expect(matches).toMatchInlineSnapshot(`
      [
        {
          "kind": "const",
          "kindModifiers": "",
          "name": "greeting",
          "sortText": "11",
        },
      ]
    `);
  });

  test.skip('immediately after a change', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      export default class MyComponent<T> extends Component {
        <template>
          {{#each "abc" as |letter|}}
            {{}}
          {{/each}}
        </template>
      }
    `;

    expect(
      await requestCompletion('ts-template-imports-app/src/index.gts', 'typescript', code),
    ).toMatchInlineSnapshot();
  });
});

async function requestCompletionItem(
  fileName: string,
  languageId: string,
  content: string,
  itemLabel: string,
): Promise<any> {
  const completions = await requestCompletion(fileName, languageId, content);
  let completion = completions.find((item: any) => item.name === itemLabel);
  expect(completion).toBeDefined();
  return completion!;
}

async function requestCompletion(
  fileName: string,
  languageId: string,
  contentWithCursor: string,
): Promise<any> {
  const [offset, content] = extractCursor(contentWithCursor);
  const document = await prepareDocument(fileName, languageId, content);
  const res = await performCompletionRequest(document, offset);
  return res;
}

async function performCompletionRequest(document: TextDocument, offset: number): Promise<any> {
  const workspaceHelper = await getSharedTestWorkspaceHelper();
  const res = await workspaceHelper.tsserver.message({
    seq: workspaceHelper.nextSeq(),
    command: 'completions',
    arguments: {
      file: URI.parse(document.uri).fsPath,
      position: offset,
    },
  });

  expect(res.success).toBe(true);
  return res.body;
}
