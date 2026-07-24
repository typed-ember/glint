import { stripIndent } from 'common-tags';
import {
  requestTsserverDiagnostics,
  teardownSharedTestWorkspaceAfterEach,
  ensureNoOpenDocuments,
} from 'glint-monorepo-test-utils';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

describe('Language Server: Diagnostics — modifiers', () => {
  beforeEach(ensureNoOpenDocuments);
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test('reports element-type mismatch for a modifier applied to the wrong element', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';
      import type { ModifierLike } from '@glint/template';

      declare const tableScroll: ModifierLike<{ Element: HTMLTableElement }>;

      export default class Repro extends Component {
        <template>
          <div {{tableScroll}}>x</div>
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
    expect(diagnostics[0].start.line).toBe(8);
  });

  test('reports element-type mismatch for a modifier invoked with args', async () => {
    // With args present, TS anchors the TS2345 on the generated
    // `__glintY__.element` argument, which is mapped back to the modifier
    // via `forNode` in `emitModifiers`.
    const code = stripIndent`
      import Component from '@glimmer/component';
      import type { ModifierLike } from '@glint/template';

      declare const tableScroll: ModifierLike<{
        Element: HTMLTableElement;
        Args: { Named: { offset?: number } };
      }>;

      export default class Repro extends Component {
        <template>
          <div {{tableScroll offset=3}}>x</div>
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
    expect(diagnostics[0].start.line).toBe(11);
  });

  test('reports missing-argument errors on modifier invocations', async () => {
    // The modifier analog of the helper case fixed in #1168. Note that the
    // element counts as the first argument, hence "Expected 3 arguments,
    // but got 2".
    const code = stripIndent`
      import Component from '@glimmer/component';
      import type { ModifierLike } from '@glint/template';

      declare const withArgs: ModifierLike<{
        Element: HTMLElement;
        Args: { Positional: [a: string, b: number] };
      }>;

      export default class Repro extends Component {
        <template>
          <div {{withArgs 'one'}}>x</div>
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0].text).toContain('Expected 3 arguments, but got 2');
    expect(diagnostics[0].start.line).toBe(11);
  });
});
