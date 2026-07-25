import { stripIndent } from 'common-tags';
import {
  requestTsserverDiagnostics,
  teardownSharedTestWorkspaceAfterEach,
  ensureNoOpenDocuments,
} from 'glint-monorepo-test-utils';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

describe('Language Server: Diagnostics — sub-expressions', () => {
  beforeEach(ensureNoOpenDocuments);
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test('reports missing-argument errors in sub-expression position', async () => {
    // TS anchors "Expected N arguments, but got M" on the generated
    // `__glintDSL__.resolve(...)` callee. Direct mustaches got a covering
    // mapping in #1168, but sub-expressions did not, so the same error one
    // paren-level deeper was silently dropped.
    const code = stripIndent`
      import Component from '@glimmer/component';

      declare function needsTwo(a: string, b: number): string;
      declare function identity<T>(x: T): T;

      export default class Repro extends Component {
        <template>
          {{identity (needsTwo 'one')}}
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0].code).toBe(2554);
    expect(diagnostics[0].text).toContain('Expected 2 arguments, but got 1');
    expect(diagnostics[0].start.line).toBe(8);
  });
});
