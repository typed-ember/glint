import {
  getSharedTestWorkspaceHelper,
  teardownSharedTestWorkspaceAfterEach,
  prepareDocument,
} from 'glint-monorepo-test-utils';
import { describe, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { CodeAction, CodeActionContext, Range } from '@volar/language-server';

describe('Language Server: Code Actions - Component Transformations', () => {
  afterEach(teardownSharedTestWorkspaceAfterEach);

  describe('class component → template-only', () => {
    test('default export class with no extra members', async () => {
      const code = stripIndent`
        import Component from '@glimmer/component';

        export default class MyComponent extends Component {
          <template>
            Hello, world!
          </template>
        }
      `;

      const document = await prepareDocument(
        'ts-template-imports-app/src/empty-fixture.gts',
        'glimmer-ts',
        code,
      );

      const actions = await requestCodeActions(document, {
        start: { line: 2, character: 0 },
        end: { line: 2, character: 0 },
      });

      const convertAction = findAction(actions, 'Convert to template-only component');
      expect(convertAction).toBeDefined();
      expect(convertAction!.kind).toBe('refactor.rewrite');
      expect(convertAction!.edit).toBeDefined();

      // Apply the edit and check the result
      const edits = convertAction!.edit!.changes!;
      const documentEdits = Object.values(edits)[0]!;
      const newText = applyEdits(code, documentEdits);

      expect(newText).toMatchInlineSnapshot(`
        "
        export default <template>
            Hello, world!
          </template>"
      `);
    });

    test('default export class with signature', async () => {
      const code = stripIndent`
        import Component from '@glimmer/component';

        interface MySignature {
          Args: { name: string };
        }

        export default class MyComponent extends Component<MySignature> {
          <template>
            Hello, {{@name}}!
          </template>
        }
      `;

      const document = await prepareDocument(
        'ts-template-imports-app/src/empty-fixture.gts',
        'glimmer-ts',
        code,
      );

      const actions = await requestCodeActions(document, {
        start: { line: 7, character: 4 },
        end: { line: 7, character: 4 },
      });

      const convertAction = findAction(actions, 'Convert to template-only component');
      expect(convertAction).toBeDefined();

      const edits = convertAction!.edit!.changes!;
      const documentEdits = Object.values(edits)[0]!;
      const newText = applyEdits(code, documentEdits);

      expect(newText).toMatchInlineSnapshot(`
        "
        import type { ComponentLike } from '@glint/template';

        interface MySignature {
          Args: { name: string };
        }

        export default <template>
            Hello, {{@name}}!
          </template> as ComponentLike<MySignature>;"
      `);
    });

    test('named export class with no extra members', async () => {
      const code = stripIndent`
        import Component from '@glimmer/component';

        interface FooSignature {
          Args: { value: number };
        }

        export class Foo extends Component<FooSignature> {
          <template>
            Value: {{@value}}
          </template>
        }
      `;

      const document = await prepareDocument(
        'ts-template-imports-app/src/empty-fixture.gts',
        'glimmer-ts',
        code,
      );

      const actions = await requestCodeActions(document, {
        start: { line: 6, character: 0 },
        end: { line: 6, character: 0 },
      });

      const convertAction = findAction(actions, 'Convert to template-only component');
      expect(convertAction).toBeDefined();

      const edits = convertAction!.edit!.changes!;
      const documentEdits = Object.values(edits)[0]!;
      const newText = applyEdits(code, documentEdits);

      expect(newText).toMatchInlineSnapshot(`
        "import type { TOC } from '@ember/component/template-only';

        interface FooSignature {
          Args: { value: number };
        }

        export const Foo: TOC<FooSignature> = <template>
            Value: {{@value}}
          </template>;"
      `);
    });

    test('non-exported class with no extra members', async () => {
      const code = stripIndent`
        import Component from '@glimmer/component';

        class Internal extends Component {
          <template>
            internal content
          </template>
        }
      `;

      const document = await prepareDocument(
        'ts-template-imports-app/src/empty-fixture.gts',
        'glimmer-ts',
        code,
      );

      const actions = await requestCodeActions(document, {
        start: { line: 2, character: 0 },
        end: { line: 2, character: 0 },
      });

      const convertAction = findAction(actions, 'Convert to template-only component');
      expect(convertAction).toBeDefined();

      const edits = convertAction!.edit!.changes!;
      const documentEdits = Object.values(edits)[0]!;
      const newText = applyEdits(code, documentEdits);

      expect(newText).toMatchInlineSnapshot(`
        "
        const Internal = <template>
            internal content
          </template>;"
      `);
    });

    test('class with extra members is disabled', async () => {
      const code = stripIndent`
        import Component from '@glimmer/component';

        export default class MyComponent extends Component {
          private message = 'Hello';

          <template>
            {{this.message}}, world!
          </template>
        }
      `;

      const document = await prepareDocument(
        'ts-template-imports-app/src/empty-fixture.gts',
        'glimmer-ts',
        code,
      );

      const actions = await requestCodeActions(document, {
        start: { line: 2, character: 0 },
        end: { line: 2, character: 0 },
      });

      const convertAction = findAction(actions, 'Convert to template-only component');
      expect(convertAction).toBeDefined();
      expect(convertAction!.disabled).toBeDefined();
      expect(convertAction!.disabled!.reason).toContain('properties or methods');
    });
  });

  describe('template-only → class component', () => {
    test('export default template', async () => {
      const code = stripIndent`
        export default <template>
          Hello, world!
        </template>
      `;

      const document = await prepareDocument(
        'ts-template-imports-app/src/empty-fixture.gts',
        'glimmer-ts',
        code,
      );

      const actions = await requestCodeActions(document, {
        start: { line: 0, character: 16 },
        end: { line: 0, character: 16 },
      });

      const convertAction = findAction(actions, 'Convert to class component');
      expect(convertAction).toBeDefined();
      expect(convertAction!.kind).toBe('refactor.rewrite');
      expect(convertAction!.edit).toBeDefined();

      const edits = convertAction!.edit!.changes!;
      const documentEdits = Object.values(edits)[0]!;
      const newText = applyEdits(code, documentEdits);

      expect(newText).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent extends Component {
          <template>
            Hello, world!
          </template>
        }"
      `);
    });

    test('named const with TOC type', async () => {
      const code = stripIndent`
        import type { TOC } from '@ember/component/template-only';

        export const Greeting: TOC<{ Args: { name: string } }> = <template>
          Hello, {{@name}}!
        </template>;
      `;

      const document = await prepareDocument(
        'ts-template-imports-app/src/empty-fixture.gts',
        'glimmer-ts',
        code,
      );

      const actions = await requestCodeActions(document, {
        start: { line: 2, character: 0 },
        end: { line: 2, character: 0 },
      });

      const convertAction = findAction(actions, 'Convert to class component');
      expect(convertAction).toBeDefined();

      const edits = convertAction!.edit!.changes!;
      const documentEdits = Object.values(edits)[0]!;
      const newText = applyEdits(code, documentEdits);

      expect(newText).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';

        export class Greeting extends Component<{ Args: { name: string } }> {
          <template>
            Hello, {{@name}}!
          </template>
        }"
      `);
    });

    test('non-exported const assignment', async () => {
      const code = stripIndent`
        const Widget = <template>
          widget content
        </template>;
      `;

      const document = await prepareDocument(
        'ts-template-imports-app/src/empty-fixture.gts',
        'glimmer-ts',
        code,
      );

      const actions = await requestCodeActions(document, {
        start: { line: 0, character: 15 },
        end: { line: 0, character: 15 },
      });

      const convertAction = findAction(actions, 'Convert to class component');
      expect(convertAction).toBeDefined();

      const edits = convertAction!.edit!.changes!;
      const documentEdits = Object.values(edits)[0]!;
      const newText = applyEdits(code, documentEdits);

      expect(newText).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        class Widget extends Component {
          <template>
            widget content
          </template>
        }"
      `);
    });

    test('bare template at module level', async () => {
      const code = stripIndent`
        <template>
          Just a bare template
        </template>
      `;

      const document = await prepareDocument(
        'ts-template-imports-app/src/empty-fixture.gts',
        'glimmer-ts',
        code,
      );

      const actions = await requestCodeActions(document, {
        start: { line: 0, character: 5 },
        end: { line: 0, character: 5 },
      });

      const convertAction = findAction(actions, 'Convert to class component');
      expect(convertAction).toBeDefined();

      const edits = convertAction!.edit!.changes!;
      const documentEdits = Object.values(edits)[0]!;
      const newText = applyEdits(code, documentEdits);

      expect(newText).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent extends Component {
          <template>
            Just a bare template
          </template>
        }"
      `);
    });
  });

  describe('multi-component files', () => {
    test('convert class component to template-only, leaving sibling template-only untouched', async () => {
      const code = stripIndent`
        import Component from '@glimmer/component';
        import type { TOC } from '@ember/component/template-only';

        const Sidebar: TOC<{ Args: { title: string } }> = <template>
          <aside>{{@title}}</aside>
        </template>;

        export default class Main extends Component {
          <template>
            <Sidebar @title="Nav" />
            Main content
          </template>
        }
      `;

      const document = await prepareDocument(
        'ts-template-imports-app/src/empty-fixture.gts',
        'glimmer-ts',
        code,
      );

      // Cursor on the class component (Main), not on Sidebar
      const actions = await requestCodeActions(document, {
        start: { line: 8, character: 0 },
        end: { line: 8, character: 0 },
      });

      const convertAction = findAction(actions, 'Convert to template-only component');
      expect(convertAction).toBeDefined();
      expect(convertAction!.edit).toBeDefined();

      const edits = convertAction!.edit!.changes!;
      const documentEdits = Object.values(edits)[0]!;
      const newText = applyEdits(code, documentEdits);

      expect(newText).toMatchInlineSnapshot(`
        "import type { TOC } from '@ember/component/template-only';

        const Sidebar: TOC<{ Args: { title: string } }> = <template>
          <aside>{{@title}}</aside>
        </template>;

        export default <template>
            <Sidebar @title="Nav" />
            Main content
          </template>"
      `);
    });

    test('convert template-only to class, leaving sibling class component untouched', async () => {
      const code = stripIndent`
        import Component from '@glimmer/component';

        export default class Page extends Component {
          <template>
            <Banner />
            Page content
          </template>
        }

        const Banner = <template>
          <header>Welcome!</header>
        </template>;
      `;

      const document = await prepareDocument(
        'ts-template-imports-app/src/empty-fixture.gts',
        'glimmer-ts',
        code,
      );

      // Cursor on Banner (the template-only component)
      const actions = await requestCodeActions(document, {
        start: { line: 9, character: 16 },
        end: { line: 9, character: 16 },
      });

      const convertAction = findAction(actions, 'Convert to class component');
      expect(convertAction).toBeDefined();
      expect(convertAction!.edit).toBeDefined();

      const edits = convertAction!.edit!.changes!;
      const documentEdits = Object.values(edits)[0]!;
      const newText = applyEdits(code, documentEdits);

      // Page class component should remain untouched
      expect(newText).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';

        export default class Page extends Component {
          <template>
            <Banner />
            Page content
          </template>
        }

        class Banner extends Component {
          <template>
            <header>Welcome!</header>
          </template>
        }"
      `);
    });

    test('only offers action for component under cursor, not sibling', async () => {
      const code = stripIndent`
        import Component from '@glimmer/component';

        export default class App extends Component {
          <template>
            Hello from App
          </template>
        }

        const Footer = <template>
          <footer>Footer</footer>
        </template>;
      `;

      const document = await prepareDocument(
        'ts-template-imports-app/src/empty-fixture.gts',
        'glimmer-ts',
        code,
      );

      // Cursor on App (class component) — should only get "Convert to template-only"
      const appActions = await requestCodeActions(document, {
        start: { line: 3, character: 4 },
        end: { line: 3, character: 4 },
      });
      expect(findAction(appActions, 'Convert to template-only component')).toBeDefined();
      expect(findAction(appActions, 'Convert to class component')).toBeUndefined();

      // Cursor on Footer (template-only) — should only get "Convert to class component"
      const footerActions = await requestCodeActions(document, {
        start: { line: 8, character: 16 },
        end: { line: 8, character: 16 },
      });
      expect(findAction(footerActions, 'Convert to class component')).toBeDefined();
      expect(findAction(footerActions, 'Convert to template-only component')).toBeUndefined();
    });

    test('multiple template-only components, convert only one', async () => {
      const code = stripIndent`
        const First = <template>
          first
        </template>;

        const Second = <template>
          second
        </template>;

        const Third = <template>
          third
        </template>;
      `;

      const document = await prepareDocument(
        'ts-template-imports-app/src/empty-fixture.gts',
        'glimmer-ts',
        code,
      );

      // Cursor on Second
      const actions = await requestCodeActions(document, {
        start: { line: 4, character: 16 },
        end: { line: 4, character: 16 },
      });

      const convertAction = findAction(actions, 'Convert to class component');
      expect(convertAction).toBeDefined();

      const edits = convertAction!.edit!.changes!;
      const documentEdits = Object.values(edits)[0]!;
      const newText = applyEdits(code, documentEdits);

      // First and Third should remain as template-only
      expect(newText).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        const First = <template>
          first
        </template>;

        class Second extends Component {
          <template>
            second
          </template>
        }

        const Third = <template>
          third
        </template>;"
      `);
    });
  });

  describe('no actions offered in wrong context', () => {
    test('cursor outside any component', async () => {
      const code = stripIndent`
        import Component from '@glimmer/component';

        const x = 42;

        export default class MyComponent extends Component {
          <template>
            Hello
          </template>
        }
      `;

      const document = await prepareDocument(
        'ts-template-imports-app/src/empty-fixture.gts',
        'glimmer-ts',
        code,
      );

      // Cursor on `const x = 42;` line
      const actions = await requestCodeActions(document, {
        start: { line: 2, character: 0 },
        end: { line: 2, character: 0 },
      });

      const convertToTemplateOnly = findAction(actions, 'Convert to template-only component');
      const convertToClass = findAction(actions, 'Convert to class component');
      expect(convertToTemplateOnly).toBeUndefined();
      expect(convertToClass).toBeUndefined();
    });

    test('plain ts file with no templates', async () => {
      const code = stripIndent`
        export const x = 42;
      `;

      const document = await prepareDocument(
        'ts-template-imports-app/src/empty-fixture.gts',
        'glimmer-ts',
        code,
      );

      const actions = await requestCodeActions(document, {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      });

      const convertToTemplateOnly = findAction(actions, 'Convert to template-only component');
      const convertToClass = findAction(actions, 'Convert to class component');
      expect(convertToTemplateOnly).toBeUndefined();
      expect(convertToClass).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requestCodeActions(
  document: TextDocument,
  range: Range,
): Promise<(CodeAction | { command: string })[]> {
  const workspaceHelper = await getSharedTestWorkspaceHelper();

  const context: CodeActionContext = {
    diagnostics: [],
  };

  const res = await workspaceHelper.glintserver.sendCodeActionsRequest(
    document.uri,
    range,
    context,
  );

  return (res ?? []) as (CodeAction | { command: string })[];
}

function findAction(
  actions: (CodeAction | { command: string })[],
  title: string,
): CodeAction | undefined {
  return actions.find(
    (action): action is CodeAction => 'title' in action && action.title === title,
  ) as CodeAction | undefined;
}

/**
 * Apply a set of text edits to source text, processing from bottom to top
 * to preserve offsets.
 */
function applyEdits(text: string, edits: { range: Range; newText: string }[]): string {
  // Sort edits from bottom to top to avoid offset issues
  const sorted = [...edits].sort((a, b) => {
    if (a.range.start.line !== b.range.start.line) {
      return b.range.start.line - a.range.start.line;
    }
    return b.range.start.character - a.range.start.character;
  });

  const lines = text.split('\n');

  for (const edit of sorted) {
    const startOffset = lineCharToOffset(lines, edit.range.start.line, edit.range.start.character);
    const endOffset = lineCharToOffset(lines, edit.range.end.line, edit.range.end.character);

    text = text.slice(0, startOffset) + edit.newText + text.slice(endOffset);
    // Recompute lines after each edit
    lines.length = 0;
    lines.push(...text.split('\n'));
  }

  return text;
}

function lineCharToOffset(lines: string[], line: number, character: number): number {
  let offset = 0;
  for (let i = 0; i < line && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }
  return offset + character;
}
