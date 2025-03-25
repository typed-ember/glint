import * as fs from 'node:fs';
import * as os from 'node:os';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { ConfigLoader } from '../../src/config/index.js';
import { normalizePath } from '../../src/config/config.js';

describe('Config: loadConfig', () => {
  const testDir = `${os.tmpdir()}/glint-config-test-loader-${process.pid}`;

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

  test('returns null if no config file is found', () => {
    expect(new ConfigLoader().configForDirectory(testDir)).toBeNull();
  });

  test('returns null if no Glint config is found in the config file', () => {
    fs.writeFileSync(`${testDir}/tsconfig.json`, JSON.stringify({}));
    expect(new ConfigLoader().configForDirectory(testDir)).toBeNull();
  });

  test('returns unique config instances for separate files', () => {
    fs.mkdirSync(`${testDir}/packages/a/src`, { recursive: true });
    fs.mkdirSync(`${testDir}/packages/b/src`, { recursive: true });

    fs.writeFileSync(
      `${testDir}/tsconfig.json`,
      JSON.stringify({ glint: { environment: './local-env.js' } }),
    );

    fs.writeFileSync(
      `${testDir}/packages/a/tsconfig.json`,
      JSON.stringify({ glint: { environment: '../../local-env.js' } }),
    );

    let loader = new ConfigLoader();
    let configA = loader.configForFile(`${testDir}/packages/a/src/a.ts`);
    let configB = loader.configForFile(`${testDir}/packages/b/src/b.ts`);

    expect(configA?.rootDir).toBe(normalizePath(`${testDir}/packages/a`));
    expect(configB?.rootDir).toBe(normalizePath(`${testDir}`));
  });

  test('returns the same config instance for files governed by the same config', () => {
    fs.writeFileSync(
      `${testDir}/tsconfig.json`,
      JSON.stringify({
        glint: { environment: './local-env.js' },
      }),
    );

    let loader = new ConfigLoader();
    let configA = loader.configForFile(`${testDir}/src/a.ts`);
    let configB = loader.configForFile(`${testDir}/src/b.ts`);

    expect(configA).toBe(configB);
  });

  describe('extending other config', () => {
    test('fully inherited config', () => {
      fs.writeFileSync(
        `${testDir}/tsconfig.base.json`,
        JSON.stringify({ glint: { environment: `./local-env` } }),
      );

      fs.writeFileSync(
        `${testDir}/tsconfig.json`,
        JSON.stringify({ extends: './tsconfig.base.json' }),
      );

      let config = new ConfigLoader().configForFile(`${testDir}/src/foo.glint.ts`);

      expect(config?.rootDir).toBe(normalizePath(testDir));
      expect(config?.environment.names).toEqual(['./local-env']);
    });

    test('fully self-defined config', () => {
      fs.writeFileSync(`${testDir}/tsconfig.base.json`, JSON.stringify({}));
      fs.writeFileSync(
        `${testDir}/tsconfig.json`,
        JSON.stringify({ extends: './tsconfig.base.json', glint: { environment: './local-env' } }),
      );

      let config = new ConfigLoader().configForFile(`${testDir}/src/foo.glint.ts`);

      expect(config?.rootDir).toBe(normalizePath(testDir));
      expect(config?.environment.names).toEqual(['./local-env']);
    });

    test('illegal inheritance', () => {
      fs.writeFileSync(
        `${testDir}/tsconfig.base.json`,
        JSON.stringify({ glint: { environment: `./local-env`, transform: {} } }),
      );

      fs.writeFileSync(
        `${testDir}/tsconfig.json`,
        JSON.stringify({ extends: './tsconfig.base.json' }),
      );

      expect(() => new ConfigLoader().configForFile(`${testDir}/foo.ts`)).toThrow(
        'Glint `transform` options may not be specified in extended config.',
      );
    });

    test('merging config', () => {
      fs.writeFileSync(
        `${testDir}/tsconfig.base.json`,
        JSON.stringify({ glint: { environment: './local-env' } }),
      );

      fs.writeFileSync(
        `${testDir}/tsconfig.json`,
        JSON.stringify({
          extends: './tsconfig.base.json',
          glint: {},
        }),
      );

      let config = new ConfigLoader().configForFile(`${testDir}/src/foo.glint.ts`);

      expect(config?.rootDir).toBe(normalizePath(testDir));
      expect(config?.environment.names).toEqual(['./local-env']);
    });
  });
});
