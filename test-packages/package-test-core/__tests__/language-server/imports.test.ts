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

    const diagnostics = await requestTsserverDiagnostics(
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

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/ephemeral-vanilla-typescript.ts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });
});
