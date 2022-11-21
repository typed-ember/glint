import * as fs from 'node:fs';
import * as os from 'node:os';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { loadConfig } from '../../src/config/index.js';
import { normalizePath } from '../../src/config/config.js';

describe('Config: loadConfig', () => {
  const testDir = `${os.tmpdir()}/glint-config-test-load-config-${process.pid}`;

  beforeEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir);
    fs.writeFileSync(
      `${testDir}/local-env.js`,
      `module.exports = () => ({ tags: { test: {} } });\n`
    );
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
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
          checkStandaloneTemplates: false,
        },
      })
    );
    fs.writeFileSync(
      `${testDir}/deeply/tsconfig.json`,
      JSON.stringify({
        extends: '../tsconfig.json',
        glint: {
          environment: '../local-env',
        },
      })
    );

    let config = loadConfig(`${testDir}/deeply/nested/directory`);

    expect(config.rootDir).toBe(normalizePath(`${testDir}/deeply`));
    expect(config.environment.getConfiguredTemplateTags()).toEqual({ test: {} });
    expect(config.checkStandaloneTemplates).toBe(false);
  });
});
