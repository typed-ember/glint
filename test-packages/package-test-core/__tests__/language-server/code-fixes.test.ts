import { stripIndent } from 'common-tags';
import {
  getSharedTestWorkspaceHelper,
  prepareDocument,
  requestTsserverDiagnostics,
  teardownSharedTestWorkspaceAfterEach,
} from 'glint-monorepo-test-utils';
import { URI } from 'vscode-uri';
import { afterEach, describe, expect, test } from 'vitest';

describe('Language Server: Code Fixes (ts plugin)', () => {
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test('suggests @glimmer/component import for Component identifier (.gts)', async () => {
    const code = stripIndent`
      export default class Application extends Component {
        <template>
          hello
        </template>
      }
    `;

    const fixes = await requestCodeFixes(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
      'Component',
      [2304],
    );

    const glimmerFix = fixes.find(
      (fix: any) => fix.description?.includes('@glimmer/component'),
    );

    expect(glimmerFix).toBeDefined();
    expect(glimmerFix.description).toContain('@glimmer/component');
  });

  test('suggests @glimmer/component import for Component identifier (.gjs)', async () => {
    const code = stripIndent`
      export default class Application extends Component {
        <template>
          hello
        </template>
      }
    `;

    const fixes = await requestCodeFixes(
      'ts-template-imports-app-no-config/src/empty-fixture.gjs',
      'glimmer-js',
      code,
      'Component',
      [2304],
    );

    const glimmerFix = fixes.find(
      (fix: any) => fix.description?.includes('@glimmer/component'),
    );

    expect(glimmerFix).toBeDefined();
    expect(glimmerFix.description).toContain('@glimmer/component');
  });
});

async function requestCodeFixes(
  fileName: string,
  languageId: string,
  content: string,
  identifierText: string,
  errorCodes: number[],
): Promise<any[]> {
  const workspaceHelper = await getSharedTestWorkspaceHelper();
  const document = await prepareDocument(fileName, languageId, content);
  const filePath = URI.parse(document.uri).fsPath;

  // Find the position of the identifier in the content (line/offset, 1-based).
  const offset = content.indexOf(identifierText);
  expect(offset).toBeGreaterThanOrEqual(0);

  const beforeIdentifier = content.slice(0, offset);
  const lines = beforeIdentifier.split('\n');
  const startLine = lines.length;
  const startOffset = lines[lines.length - 1].length + 1; // 1-based

  const endOffset = startOffset + identifierText.length;

  const res = await workspaceHelper.tsserver.message({
    seq: workspaceHelper.nextSeq(),
    command: 'getCodeFixes',
    arguments: {
      file: filePath,
      startLine,
      startOffset,
      endLine: startLine,
      endOffset,
      errorCodes,
    },
  });

  expect(res.success).toBe(true);
  return res.body ?? [];
}
