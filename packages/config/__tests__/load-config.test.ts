import os from 'os';
import fs from 'fs';
import { loadConfig } from '../src';

describe('loadConfig', () => {
  const testDir = `${os.tmpdir()}/glint-config-test-${process.pid}`;

  beforeEach(() => {
    fs.rmdirSync(testDir, { recursive: true });
    fs.mkdirSync(testDir);
  });

  afterEach(() => {
    fs.rmdirSync(testDir, { recursive: true });
  });

  test('returns a default config if none is found', () => {
    let config = loadConfig(testDir);

    expect(config.rootDir).toBe(testDir);
    expect(config.includesFile(`${testDir}/index.ts`)).toBe(true);
    expect(config.includesFile(__filename)).toBe(false);
  });

  test('locating config in a parent directory', () => {
    fs.mkdirSync(`${testDir}/deeply/nested/directory`, { recursive: true });
    fs.writeFileSync(`${testDir}/.glintrc`, `include: '**/*.root.ts'`);
    fs.writeFileSync(`${testDir}/deeply/.glintrc`, `include: '**/*.nested.ts'`);

    let config = loadConfig(`${testDir}/deeply/nested/directory`);

    expect(config.rootDir).toBe(`${testDir}/deeply`);
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
            include: '**/*.from-pkg.ts',
          },
        })
      );

      let config = loadConfig(testDir);

      expect(config.includesFile(`${testDir}/index.ts`)).toBe(false);
      expect(config.includesFile(`${testDir}/index.from-pkg.ts`)).toBe(true);
    });

    test('reads config from .glintrc', () => {
      fs.writeFileSync(`${testDir}/.glintrc`, `include: '**/*.extensionless.ts'`);

      let config = loadConfig(testDir);

      expect(config.includesFile(`${testDir}/index.ts`)).toBe(false);
      expect(config.includesFile(`${testDir}/index.extensionless.ts`)).toBe(true);
    });

    test('reads config from .glintrc.js', () => {
      fs.writeFileSync(`${testDir}/.glintrc.js`, `module.exports = { include: '**/*.jsrc.ts' };`);

      let config = loadConfig(testDir);

      expect(config.includesFile(`${testDir}/index.ts`)).toBe(false);
      expect(config.includesFile(`${testDir}/index.jsrc.ts`)).toBe(true);
    });

    test('reads config from glint.config.js', () => {
      fs.writeFileSync(
        `${testDir}/glint.config.js`,
        `module.exports = { include: '**/*.config.ts' };`
      );

      let config = loadConfig(testDir);

      expect(config.includesFile(`${testDir}/index.ts`)).toBe(false);
      expect(config.includesFile(`${testDir}/index.config.ts`)).toBe(true);
    });
  });
});
