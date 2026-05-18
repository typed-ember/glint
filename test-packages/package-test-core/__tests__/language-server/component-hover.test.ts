import {
  extractCursors,
  getSharedTestWorkspaceHelper,
  prepareDocument,
  teardownSharedTestWorkspaceAfterEach,
} from 'glint-monorepo-test-utils';
import { afterEach, describe, expect, test } from 'vitest';
import { stripIndent } from 'common-tags';

/**
 * Tests for the Volar-side `g-component-hover` plugin (synthesises a
 * `interface FooSignature { … }` markdown block for invocations of custom
 * components). The plugin must only fire when the cursor is on the
 * component's tag name (opening or closing); on args, attributes, content,
 * or plain HTML tags it must not contribute, otherwise the language client
 * concatenates the synthesised block with the TS hover for whatever symbol
 * the user is pointing at (e.g. `@target` → `(property) GreetingSignature$Args.target: string`),
 * producing a confusing two-part tooltip.
 */
describe('Language Server: Component Hover (g-component-hover plugin)', () => {
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test('fires on the opening tag name', async () => {
    const hover = await performComponentHoverRequestAt(
      stripIndent`
        import Component from '@glimmer/component';
        import Greeting from './Greeting.gts';

        export default class Application extends Component {
          <template>
            <%Greeting @target="world" />
          </template>
        }
      `,
    );

    expect(hover).not.toBeNull();
    expect(hover!.contents).toMatchObject({ kind: 'markdown' });
    expect((hover!.contents as { value: string }).value).toContain('interface GreetingSignature');
  });

  test('fires inside the opening tag name', async () => {
    const hover = await performComponentHoverRequestAt(
      stripIndent`
        import Component from '@glimmer/component';
        import Greeting from './Greeting.gts';

        export default class Application extends Component {
          <template>
            <Gre%eting @target="world" />
          </template>
        }
      `,
    );

    expect(hover).not.toBeNull();
    expect((hover!.contents as { value: string }).value).toContain('interface GreetingSignature');
  });

  test('fires on the closing tag name', async () => {
    const hover = await performComponentHoverRequestAt(
      stripIndent`
        import Component from '@glimmer/component';
        import Greeting from './Greeting.gts';

        export default class Application extends Component {
          <template>
            <Greeting @target="world">hi</Gre%eting>
          </template>
        }
      `,
    );

    expect(hover).not.toBeNull();
    expect((hover!.contents as { value: string }).value).toContain('interface GreetingSignature');
    // The returned range must cover the closing tag (the line containing `</Greeting>`),
    // not the opening tag. Before the fix the plugin returned the opening-tag range
    // for any offset inside the element, which made the editor highlight the wrong
    // span when hovering the closing tag.
    const range = hover!.range as {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
    expect(range.start.character).toBe(34);
    expect(range.end.character).toBe(42);
  });

  test('does not fire on a named argument', async () => {
    const hover = await performComponentHoverRequestAt(
      stripIndent`
        import Component from '@glimmer/component';
        import Greeting from './Greeting.gts';

        export default class Application extends Component {
          <template>
            <Greeting @tar%get="world" />
          </template>
        }
      `,
    );

    expect(hover).toBeNull();
  });

  test('does not fire on the argument value', async () => {
    const hover = await performComponentHoverRequestAt(
      stripIndent`
        import Component from '@glimmer/component';
        import Greeting from './Greeting.gts';

        export default class Application extends Component {
          <template>
            <Greeting @target="wo%rld" />
          </template>
        }
      `,
    );

    expect(hover).toBeNull();
  });

  test('does not fire on whitespace between tag name and attributes', async () => {
    const hover = await performComponentHoverRequestAt(
      stripIndent`
        import Component from '@glimmer/component';
        import Greeting from './Greeting.gts';

        export default class Application extends Component {
          <template>
            <Greeting% @target="world" />
          </template>
        }
      `,
    );

    expect(hover).toBeNull();
  });

  test('does not fire on a plain HTML element', async () => {
    const hover = await performComponentHoverRequestAt(
      stripIndent`
        import Component from '@glimmer/component';

        export default class Application extends Component {
          <template>
            <di%v class="container">hello</div>
          </template>
        }
      `,
    );

    expect(hover).toBeNull();
  });
});

async function performComponentHoverRequestAt(contentWithCursor: string): Promise<{
  contents: unknown;
  range?: unknown;
} | null> {
  const [offsets, content] = extractCursors(contentWithCursor);
  if (offsets.length !== 1) {
    throw new Error(`expected exactly one cursor (%) in fixture, got ${offsets.length}`);
  }

  const document = await prepareDocument(
    'ts-template-imports-app/src/empty-fixture.gts',
    'glimmer-ts',
    content,
  );

  const position = document.positionAt(offsets[0]);

  const workspaceHelper = await getSharedTestWorkspaceHelper();
  // sendHoverRequest dispatches to every registered Volar hover provider; the
  // `g-component-hover` plugin is the only one that emits a markdown
  // "interface XSignature" block, so we can identify its contribution by
  // checking for that substring (and assert `null`/no signature contents
  // when the plugin must not fire).
  const response = (await workspaceHelper.glintserver.sendHoverRequest(document.uri, position)) as {
    contents: unknown;
    range?: unknown;
  } | null;

  if (!response) return null;

  const contents = response.contents;
  const value =
    contents && typeof contents === 'object' && 'value' in contents
      ? String((contents as { value: unknown }).value)
      : '';

  // Volar may merge multiple providers' results. Only treat the response as
  // "g-component-hover fired" when the synthesised signature block is
  // present; otherwise report null so the assertion stays focused on this
  // plugin's contribution.
  if (!value.includes('interface ') || !value.includes('Signature')) {
    return null;
  }

  return response;
}
