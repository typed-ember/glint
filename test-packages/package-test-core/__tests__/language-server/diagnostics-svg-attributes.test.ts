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
    // SVG 2 presentation attributes are valid on any element in the SVG
    // namespace, including ones whose per-element list omits them.
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
