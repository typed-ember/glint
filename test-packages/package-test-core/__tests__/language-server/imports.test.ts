import { stripIndent } from 'common-tags';
import {
  requestTsserverDiagnostics,
  teardownSharedTestWorkspaceAfterEach,
} from 'glint-monorepo-test-utils';
import { afterEach, describe, expect, test } from 'vitest';

describe('Language Server: Imports', () => {
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test('support moduleResolution=bundler importing from gts file with <template>', async () => {
    const code = stripIndent`
      import Colocated from './colocated';

      export default <template>
        <Colocated @target="World" />
      </template>
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });

  test('support moduleResolution=bundler importing from gts file with no <template>', async () => {
    const code = stripIndent`
      import Colocated from './colocated';

      export default Colocated;
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });

  test('support moduleResolution=bundler importing from vanilla TS file', async () => {
    const code = stripIndent`
      import Colocated from './colocated';

      export default Colocated;
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/ephemeral-vanilla-typescript.ts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });

  test('support moduleResolution=bundler importing from gts file with explicit .gts extension', async () => {
    const code = stripIndent`
      import Colocated from './colocated/index.gts';

      export default <template>
        <Colocated @target="World" />
      </template>
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });

  test('explicit .gts extension import resolves to correct type (not `any`)', async () => {
    // If the import resolved to `any`, using the component with a wrong argument
    // would not produce a type error. This test verifies it has the specific type.
    const code = stripIndent`
      import Colocated from './colocated/index.gts';

      export default <template>
        <Colocated @wrongArg="test" />
      </template>
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    // If Colocated resolved to `any`, no errors would be reported.
    // Getting errors here proves the type is known (not `any`).
    expect(diagnostics.length).toBeGreaterThan(0);
  });

  test('support dynamic import with explicit .gts extension', async () => {
    const code = stripIndent`
      const mod = await import('./colocated/index.gts');
      export default mod.default;
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });

  test('dynamic .gts import resolves to correct type (not `any`)', async () => {
    // If the dynamic import resolved to `any`, TypeScript would not report
    // a type error here. This verifies the type is correctly inferred.
    const code = stripIndent`
      const mod = await import('./colocated/index.gts');
      const Colocated = mod.default;

      export default <template>
        <Colocated @wrongArg="test" />
      </template>
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    // If Colocated resolved to `any`, no errors would be reported.
    // Getting errors here proves the type is known (not `any`).
    expect(diagnostics.length).toBeGreaterThan(0);
  });
});
