import { stripIndent } from 'common-tags';
import {
  requestTsserverDiagnostics,
  teardownSharedTestWorkspaceAfterEach,
  ensureNoOpenDocuments,
} from 'glint-monorepo-test-utils';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

describe('Language Server: Diagnostics — quoted attribute and arg keys', () => {
  beforeEach(ensureNoOpenDocuments);
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test('reports unknown dashed attribute names', async () => {
    // Dashed attribute names are emitted as quoted object keys; the quotes
    // are generated-only text, so TS2353 (anchored on the full quoted key)
    // had no covering mapping and was silently dropped.
    const code = stripIndent`
      import Component from '@glimmer/component';

      export default class Repro extends Component {
        <template>
          <svg viewBox='0 0 1 1'><circle bogus-attr='y' /></svg>
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0].code).toBe(2353);
    expect(diagnostics[0].text).toContain('bogus-attr');
    expect(diagnostics[0].start.line).toBe(5);
  });

  test('reports unknown dashed argument names on components', async () => {
    // Component `@`-args go through their own quoted-key emission in
    // `emitComponent`, so they need the same wideVerification opt-in as
    // plain attributes.
    const code = stripIndent`
      import Component from '@glimmer/component';

      interface InnerSig {
        Args: { label?: string };
      }
      class Inner extends Component<InnerSig> {
        <template>{{@label}}</template>
      }

      export default class Outer extends Component {
        <template>
          <Inner @bogus-arg='x' />
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0].code).toBe(2353);
    expect(diagnostics[0].text).toContain('bogus-arg');
    expect(diagnostics[0].start.line).toBe(12);
  });
});
