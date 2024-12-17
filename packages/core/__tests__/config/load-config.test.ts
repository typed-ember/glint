import * as fs from 'node:fs';
import * as os from 'node:os';
import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest';
import { loadConfig } from '../../src/config/index.js';
import { normalizePath } from '../../src/config/config.js';
import { require } from '../../src/config/loader.js';

describe('Config: loadConfig', () => {
  const testDir = `${os.tmpdir()}/glint-config-test-load-config-${process.pid}`;

  beforeEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir);
    fs.writeFileSync(
      `${testDir}/local-env.js`,
      `module.exports = () => ({ tags: { test: {} } });\n`,
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
      }),
    );
    fs.writeFileSync(
      `${testDir}/deeply/tsconfig.json`,
      JSON.stringify({
        extends: '../tsconfig.json',
        glint: {
          environment: '../local-env',
        },
      }),
    );

    let config = loadConfig(`${testDir}/deeply/nested/directory`);

    expect(config.rootDir).toBe(normalizePath(`${testDir}/deeply`));
    expect(config.environment.getConfiguredTemplateTags()).toEqual({ test: {} });
    expect(config.checkStandaloneTemplates).toBe(false);
  });

  test('locates config in package', () => {
    const directory = `${testDir}/package-glint-config`;
    const nodeModulePackageDir = `${directory}/node_modules/@package1`;

    vi.spyOn(require, 'resolve').mockImplementation((id: string | undefined) => {
      if (id === '@package1/tsconfig.json') {
        return id.replace('@package1', nodeModulePackageDir);
      }
      throw Error(`Cannot resolve module ${id}`);
    });

    fs.mkdirSync(nodeModulePackageDir, { recursive: true });
    fs.writeFileSync(
      `${nodeModulePackageDir}/package.json`,
      JSON.stringify({
        name: '@package1',
        version: '1.0.0',
      })
    );
    fs.writeFileSync(
      `${nodeModulePackageDir}/tsconfig.json`,
      JSON.stringify({
        glint: {
          environment: 'kaboom',
          checkStandaloneTemplates: false,
        },
      })
    );
    fs.writeFileSync(
      `${directory}/tsconfig.json`,
      JSON.stringify({
        extends: '@package1/tsconfig.json',
        glint: {
          environment: '../local-env',
        },
      })
    );

    let config = loadConfig(`${directory}`);

    expect(config.rootDir).toBe(normalizePath(`${directory}`));
    expect(config.environment.getConfiguredTemplateTags()).toEqual({ test: {} });
    expect(config.checkStandaloneTemplates).toBe(false);
  });
});
