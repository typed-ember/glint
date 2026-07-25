import { stripIndent } from 'common-tags';
import {
  requestTsserverDiagnostics,
  teardownSharedTestWorkspaceAfterEach,
  ensureNoOpenDocuments,
} from 'glint-monorepo-test-utils';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

describe('Language Server: Diagnostics — {{yield}}', () => {
  beforeEach(ensureNoOpenDocuments);
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test('reports missing-argument errors on {{yield}}', async () => {
    // TS anchors "Expected N arguments, but got M" on the generated
    // `__glintDSL__.yieldToBlock(__glintRef__, "...")` callee, which is
    // generated-only text; without a covering mapping the diagnostic is
    // silently dropped.
    const code = stripIndent`
      import Component from '@glimmer/component';

      interface Sig {
        Blocks: {
          body: [a: string, b: number];
        };
      }

      export default class Repro extends Component<Sig> {
        <template>
          {{yield 'one' to='body'}}
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
    expect(diagnostics[0].start.line).toBe(11);
  });

  test('reports {{yield}} to an undeclared named block', async () => {
    // The block name is emitted as a generated string literal
    // (`JSON.stringify(to)`) with no source mapping, so the TS2345 anchored
    // on it is silently dropped.
    const code = stripIndent`
      import Component from '@glimmer/component';

      interface Sig {
        Blocks: {
          default: [];
        };
      }

      export default class Repro extends Component<Sig> {
        <template>
          {{yield to='nope'}}
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
    expect(diagnostics[0].text).toContain('nope');
    expect(diagnostics[0].start.line).toBe(11);
  });
});
