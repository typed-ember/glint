import { stripIndent } from 'common-tags';
import {
  requestTsserverDiagnostics,
  teardownSharedTestWorkspaceAfterEach,
  ensureNoOpenDocuments,
} from 'glint-monorepo-test-utils';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

describe('Language Server: Diagnostics — SVG presentation attributes', () => {
  beforeEach(ensureNoOpenDocuments);
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test('accepts valid SVG 2 / Filter Effects presentation attributes', async () => {
    // `vector-effect` (SVG 2) and `flood-color`/`flood-opacity` on
    // <feDropShadow> (Filter Effects 1) are valid attributes that are missing
    // from the svg-element-attributes dataset; they are added via
    // `missingSpecAttributes` in bin/build-elements.mjs so they must never be
    // reported. This guards against regressions for real-world SVG usage
    // once diagnostics on quoted attribute keys are reported (see the
    // wideVerification work).
    const code = stripIndent`
      import Component from '@glimmer/component';

      export default class Repro extends Component {
        <template>
          <svg viewBox='0 0 1 1'>
            <circle cx='0' r='1' vector-effect='non-scaling-stroke' />
            <path d='M0 0' vector-effect='non-scaling-stroke' />
            <filter><feDropShadow flood-color='black' flood-opacity='0.5' /></filter>
          </svg>
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics).toEqual([]);
  });
});
