import {
  teardownSharedTestWorkspaceAfterEach,
  requestDiagnostics,
} from 'glint-monorepo-test-utils';
import { describe, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';

describe('Language Server: Imports', () => {
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test('support moduleResolution=bundler importing from gts file with <template>', async () => {
    const code = stripIndent`
      import Colocated from './colocated';

      export default <template>
        <Colocated @target="World" />
      </template>
    `;

    const diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
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

    const diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
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

    const diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-vanilla-typescript.ts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });
});
