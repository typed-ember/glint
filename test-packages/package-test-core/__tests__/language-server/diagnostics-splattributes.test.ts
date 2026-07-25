import { stripIndent } from 'common-tags';
import {
  requestTsserverDiagnostics,
  teardownSharedTestWorkspaceAfterEach,
  ensureNoOpenDocuments,
} from 'glint-monorepo-test-utils';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

describe('Language Server: Diagnostics — ...attributes', () => {
  beforeEach(ensureNoOpenDocuments);
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test('reports element-type mismatch for ...attributes', async () => {
    // `applySplattributes(__glintRef__.element, __glintY__.element)` anchors
    // the target-element mismatch on the *second* argument, which had no
    // source mapping, so the diagnostic was silently dropped. Only the
    // source-side case (no Element in the signature) was reported.
    const code = stripIndent`
      import Component from '@glimmer/component';

      interface Sig {
        Element: HTMLCanvasElement;
      }

      export default class Repro extends Component<Sig> {
        <template>
          <div ...attributes>x</div>
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0].code).toBe(2345);
    expect(diagnostics[0].text).toContain("'HTMLDivElement' is not assignable");
    expect(diagnostics[0].start.line).toBe(9);
  });
});
