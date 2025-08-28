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

  test.skip('support moduleResolution=bundler importing .gjs with .d.ts declaration', async () => {
    const code = stripIndent`
      import Greeting from './GreetingUntypedWith_gjs_d_ts.gjs';
      import Component from '@glimmer/component';

      export default class Greeting extends Component {
        <template>
          <Greeting @target={{9999999}} />
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "code": 7016,
          "end": {
            "line": 1,
            "offset": 54,
          },
          "start": {
            "line": 1,
            "offset": 22,
          },
          "text": "Could not find a declaration file for module './GreetingUntypedWith_gjs_d_ts'. '/Users/machty/code/glint/test-packages/ts-template-imports-app/src/GreetingUntypedWith_gjs_d_ts.gjs' implicitly has an 'any' type.",
        },
        {
          "category": "error",
          "code": 2554,
          "end": {
            "line": 6,
            "offset": 37,
          },
          "start": {
            "line": 6,
            "offset": 5,
          },
          "text": "Expected 0 arguments, but got 1.",
        },
      ]
    `);
  });
});
