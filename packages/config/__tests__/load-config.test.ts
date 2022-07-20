import os from 'os';
import fs from 'fs';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { loadConfig } from '../src';
import { normalizePath } from '../src/config';

describe('loadConfig', () => {
  const testDir = `${os.tmpdir()}/glint-config-test-load-config-${process.pid}`;

  beforeEach(() => {
    fs.rmdirSync(testDir, { recursive: true });
    fs.mkdirSync(testDir);
    fs.writeFileSync(
      `${testDir}/local-env.js`,
      `module.exports = () => ({ tags: { test: {} } });\n`
    );
  });

  afterEach(() => {
    fs.rmdirSync(testDir, { recursive: true });
  });

  test('throws an error if no config is found', () => {
    expect(() => loadConfig(testDir)).toThrow(`Unable to find Glint configuration for ${testDir}`);
  });

  test('locates config in a parent directory', () => {
    fs.mkdirSync(`${testDir}/deeply/nested/directory`, { recursive: true });
    fs.writeFileSync(
      `${testDir}/tsconfig.json`,
      JSON.stringify({
        glint: {
          environment: 'kaboom',
          transform: { include: '**/*.root.ts' },
        },
      })
    );
    fs.writeFileSync(
      `${testDir}/deeply/tsconfig.json`,
      JSON.stringify({
        glint: {
          environment: '../local-env',
          transform: {
            include: '**/*.nested.ts',
          },
        },
      })
    );

    let config = loadConfig(`${testDir}/deeply/nested/directory`);

    expect(config.rootDir).toBe(normalizePath(`${testDir}/deeply`));
    expect(config.environment.getConfiguredTemplateTags()).toEqual({ test: {} });
    expect(config.includesFile(`${testDir}/deeply/index.ts`)).toBe(false);
    expect(config.includesFile(`${testDir}/deeply/index.root.ts`)).toBe(false);
    expect(config.includesFile(`${testDir}/deeply/index.nested.ts`)).toBe(true);
    expect(config.includesFile(`${testDir}/index.nested.ts`)).toBe(false);
  });
});
