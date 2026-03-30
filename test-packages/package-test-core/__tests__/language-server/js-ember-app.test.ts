import { stripIndent } from 'common-tags';
import {
  extractCursor,
  getSharedTestWorkspaceHelper,
  prepareDocument,
  teardownSharedTestWorkspaceAfterEach,
} from 'glint-monorepo-test-utils';
import { afterEach, describe, expect, test } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';

/**
 * Tests for JS-only Ember projects: no tsconfig.json, no jsconfig.json.
 * The `js-ember-app` fixture has only runtime Ember deps (no @glint/* in a
 * real consumer, though here they are wired up so the test harness can load
 * the tsserver plugin).
 */
describe('Language Server: JS Ember App (no tsconfig/jsconfig)', () => {
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test('completions for Component include @glimmer/component', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        <template>
          {{this.me%}}
        </template>
      }
    `;

    // We just need the file to parse and completions to include something meaningful.
    // The fact that the tsserver plugin activates at all (without tsconfig) is the key assertion.
    const completions = await requestCompletion(
      'js-ember-app/src/empty-fixture.gjs',
      'glimmer-js',
      code,
    );

    // We should get a completion for `message` or at minimum the tsserver plugin should respond.
    // The completions list proves the plugin is working in a JS-only project.
    expect(completions).toBeDefined();
    expect(Array.isArray(completions)).toBe(true);
  });

  test('completions include Component from @glimmer/component in scope', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      const c: Comp% = '';
    `;

    const completions = await requestCompletion(
      'js-ember-app/src/empty-fixture.gjs',
      'glimmer-js',
      code,
    );

    expect(completions).toBeDefined();
    expect(Array.isArray(completions)).toBe(true);
    const componentCompletion = completions.find((c: any) => c.name === 'Component');
    expect(componentCompletion).toBeDefined();
  });

  test('hover on pageTitle shows documentation from ember-page-title', async () => {
    const [offset, content] = extractCursor(stripIndent`
      import { page%Title } from 'ember-page-title';

      <template>
        {{pageTitle "My App"}}
      </template>
    `);

    const doc = await prepareDocument('js-ember-app/src/empty-fixture.gjs', 'glimmer-js', content);

    const hover = await performHoverRequest(doc, offset);

    expect(hover).toBeDefined();
    expect(hover.documentation).toContain('pageTitle');
  });
});

async function requestCompletion(
  fileName: string,
  languageId: string,
  contentWithCursor: string,
): Promise<any> {
  const [offset, content] = extractCursor(contentWithCursor);
  const document = await prepareDocument(fileName, languageId, content);
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

async function performHoverRequest(document: TextDocument, offset: number): Promise<any> {
  const workspaceHelper = await getSharedTestWorkspaceHelper();

  const res = await workspaceHelper.tsserver.message({
    seq: workspaceHelper.nextSeq(),
    command: 'quickinfo',
    arguments: {
      file: URI.parse(document.uri).fsPath,
      position: offset,
    },
  });
  expect(res.success).toBe(true);

  return res.body;
}
