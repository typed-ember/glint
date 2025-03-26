import * as fs from 'node:fs';
import * as os from 'node:os';
import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest';
import { loadConfig } from '@glint/core/config/index';
import { normalizePath } from '@glint/core/config/config';
import { findTypeScript, loadConfigInput, require } from '@glint/core/config/loader';

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
  });

  test('recursively extends config', () => {
    fs.mkdirSync(`${testDir}/deeply/nested/directory`, { recursive: true });
    fs.mkdirSync(`${testDir}/other`, { recursive: true });

    fs.writeFileSync(
      `${testDir}/tsconfig.json`,
      JSON.stringify({
        extends: './other/tsconfig.json',
        glint: {
          environment: '../local-env',
        },
      }),
    );
    fs.writeFileSync(
      `${testDir}/other/tsconfig.json`,
      JSON.stringify({
        glint: {
          environment: 'kaboom',
        },
      }),
    );

    fs.writeFileSync(
      `${testDir}/deeply/tsconfig.json`,
      JSON.stringify({
        extends: '../tsconfig.json',
      }),
    );

    let ts = findTypeScript(`${testDir}/deeply`);
    if (!ts) {
      expect.fail('TypeScript not found');
    }
    let glintConfig = loadConfigInput(ts, `${testDir}/deeply/tsconfig.json`);
    expect(glintConfig).toEqual({ environment: '../local-env' });

    let config = loadConfig(`${testDir}/deeply/nested/directory`);
    expect(config.rootDir).toBe(normalizePath(`${testDir}/deeply`));
  });

  test('extends multiple parents', () => {
    fs.mkdirSync(`${testDir}/deeply/nested/directory`, { recursive: true });
    fs.mkdirSync(`${testDir}/other`, { recursive: true });

    fs.writeFileSync(
      `${testDir}/tsconfig.json`,
      JSON.stringify({
        glint: {
          environment: 'kaboom',
          checkStandaloneTemplates: true,
        },
      }),
    );
    fs.writeFileSync(
      `${testDir}/other/tsconfig.json`,
      JSON.stringify({
        glint: {
          environment: '../local-env',
        },
      }),
    );

    fs.writeFileSync(
      `${testDir}/deeply/tsconfig.json`,
      JSON.stringify({
        extends: ['../tsconfig.json', '../other/tsconfig.json'],
      }),
    );

    let ts = findTypeScript(`${testDir}/deeply`);
    if (!ts) {
      expect.fail('TypeScript not found');
    }
    let glintConfig = loadConfigInput(ts, `${testDir}/deeply/tsconfig.json`);
    expect(glintConfig).toEqual({ environment: '../local-env', checkStandaloneTemplates: true });

    let config = loadConfig(`${testDir}/deeply/nested/directory`);
    expect(config.rootDir).toBe(normalizePath(`${testDir}/deeply`));
    expect(config.environment.names).toEqual(['../local-env']);
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
      }),
    );
    fs.writeFileSync(
      `${nodeModulePackageDir}/tsconfig.json`,
      JSON.stringify({
        glint: {
          environment: 'kaboom',
        },
      }),
    );
    fs.writeFileSync(
      `${directory}/tsconfig.json`,
      JSON.stringify({
        extends: '@package1/tsconfig.json',
        glint: {
          environment: '../local-env',
        },
      }),
    );

    let config = loadConfig(`${directory}`);

    expect(config.rootDir).toBe(normalizePath(`${directory}`));
    expect(config.environment.getConfiguredTemplateTags()).toEqual({ test: {} });
  });
});
