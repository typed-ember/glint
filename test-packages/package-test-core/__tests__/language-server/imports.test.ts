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

  // Regression: typed-ember/glint#1113 — invoking an imported `on` modifier
  // from `@ember/modifier` against an ember-source < 7.1 host should resolve
  // to the augmented modifier type, not to `never` (which surfaces as
  // `TS2349: Type 'never' has no call signatures.`).
  test('imported `on` modifier from @ember/modifier is callable in template', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';
      import { on } from '@ember/modifier';

      export default class ImportedModifier extends Component {
        handleChange = (event: Event): void => {
          void event;
        };

        <template>
          <button {{on "click" this.handleChange}} type="button">click</button>
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });
});
