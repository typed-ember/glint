import { findConfig } from '@glint/ember-tsc';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';

describe('ConfigLoader', () => {
  test('activates without tsconfig when package.json has Glint deps', () => {
    const fixtureRoot = path.resolve(__dirname, '../../../ts-template-imports-app-no-config');

    const config = findConfig(fixtureRoot);

    expect(config).not.toBeNull();
    expect(config!.environment.getSourceKind('example.gts')).toBe('typed-script');
    expect(config!.environment.getSourceKind('example.gjs')).toBe('untyped-script');
  });
});
