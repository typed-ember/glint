import os from 'os';
import fs from 'fs';
import { loadConfig } from '../src';
import { normalizePath } from '../src/config';

describe('loadConfig', () => {
  const testDir = `${os.tmpdir()}/glint-config-test-${process.pid}`;

  beforeEach(() => {
    fs.rmdirSync(testDir, { recursive: true });
    fs.mkdirSync(testDir);
    fs.writeFileSync(
      `${testDir}/local-env.js`,
      `module.exports = () => ({ tags: { test: true } });\n`
    );
  });

  afterEach(() => {
    fs.rmdirSync(testDir, { recursive: true });
  });

  test('throws an error if no config is found', () => {
    expect(() => loadConfig(testDir)).toThrow(`Unable to find Glint configuration for ${testDir}`);
  });

  test('locating config in a parent directory', () => {
    fs.mkdirSync(`${testDir}/deeply/nested/directory`, { recursive: true });
    fs.writeFileSync(`${testDir}/.glintrc`, `environment: kaboom\ninclude: '**/*.root.ts'`);
    fs.writeFileSync(
      `${testDir}/deeply/.glintrc`,
      `environment: '../local-env'\ninclude: '**/*.nested.ts'`
    );

    let config = loadConfig(`${testDir}/deeply/nested/directory`);

    expect(config.rootDir).toBe(normalizePath(`${testDir}/deeply`));
    expect(config.environment.getConfiguredTemplateTags()).toEqual({ test: true });
    expect(config.includesFile(`${testDir}/deeply/index.ts`)).toBe(false);
    expect(config.includesFile(`${testDir}/deeply/index.root.ts`)).toBe(false);
    expect(config.includesFile(`${testDir}/deeply/index.nested.ts`)).toBe(true);
    expect(config.includesFile(`${testDir}/index.nested.ts`)).toBe(false);
  });

  describe('config file formats', () => {
    // These tests are essentially just verifying cosmiconfig's functionality,
    // but it doesn't hurt to have some assurance of its behavior.

    test('reads config from package.json', () => {
      fs.writeFileSync(
        `${testDir}/package.json`,
        JSON.stringify({
          name: 'my-package',
          private: true,
          glint: {
            environment: './local-env',
            include: '**/*.from-pkg.ts',
          },
        })
      );

      let config = loadConfig(testDir);

      expect(config.environment.getConfiguredTemplateTags()).toEqual({ test: true });
      expect(config.includesFile(`${testDir}/index.ts`)).toBe(false);
      expect(config.includesFile(`${testDir}/index.from-pkg.ts`)).toBe(true);
    });

    test('reads config from .glintrc', () => {
      fs.writeFileSync(
        `${testDir}/.glintrc`,
        `environment: './local-env'\ninclude: '**/*.extensionless.ts'`
      );

      let config = loadConfig(testDir);

      expect(config.environment.getConfiguredTemplateTags()).toEqual({ test: true });
      expect(config.includesFile(`${testDir}/index.ts`)).toBe(false);
      expect(config.includesFile(`${testDir}/index.extensionless.ts`)).toBe(true);
    });

    test('reads config from .glintrc.js', () => {
      fs.writeFileSync(
        `${testDir}/.glintrc.js`,
        `module.exports = { environment: "./local-env", include: '**/*.jsrc.ts' };`
      );

      let config = loadConfig(testDir);

      expect(config.environment.getConfiguredTemplateTags()).toEqual({ test: true });
      expect(config.includesFile(`${testDir}/index.ts`)).toBe(false);
      expect(config.includesFile(`${testDir}/index.jsrc.ts`)).toBe(true);
    });

    test('reads config from glint.config.js', () => {
      fs.writeFileSync(
        `${testDir}/glint.config.js`,
        `module.exports = { environment: './local-env', include: '**/*.config.ts' };`
      );

      let config = loadConfig(testDir);

      expect(config.environment.getConfiguredTemplateTags()).toEqual({ test: true });
      expect(config.includesFile(`${testDir}/index.ts`)).toBe(false);
      expect(config.includesFile(`${testDir}/index.config.ts`)).toBe(true);
    });
  });
});
