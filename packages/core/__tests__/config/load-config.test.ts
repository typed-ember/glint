import * as fs from 'node:fs';
import * as os from 'node:os';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { loadClosestConfig, loadConfigFromProject } from '../../src/config/index.js';
import { normalizePath } from '../../src/config/config.js';

describe('Config', () => {
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

  describe('loadClosestConfig', () => {
    test('throws an error if no config is found', () => {
      expect(() => loadClosestConfig(testDir)).toThrow(
        `Unable to find Glint configuration for ${testDir}`
      );
    });

    test('loads from a folder', () => {
      fs.writeFileSync(
        `${testDir}/tsconfig.json`,
        JSON.stringify({
          glint: {
            environment: './local-env',
          },
        })
      );

      let config = loadClosestConfig(`${testDir}/deeply/nested/directory`);

      expect(config.rootDir).toBe(normalizePath(testDir));
      expect(config.environment.getConfiguredTemplateTags()).toEqual({ test: {} });
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

      let config = loadClosestConfig(`${testDir}/deeply/nested/directory`);

      expect(config.rootDir).toBe(normalizePath(`${testDir}/deeply`));
      expect(config.environment.getConfiguredTemplateTags()).toEqual({ test: {} });
      expect(config.checkStandaloneTemplates).toBe(false);
    });
  });

  describe('loadConfigFromProject', () => {
    test('throws an error if no config is found', () => {
      expect(() => loadConfigFromProject(testDir)).toThrow(
        `Unable to find Glint configuration for project ${testDir}`
      );
      expect(() => loadConfigFromProject(`${testDir}/tsconfig.json`)).toThrow(
        `Unable to find Glint configuration for project ${testDir}`
      );
    });

    test('loads from a tsconfig.json in a folder', () => {
      fs.writeFileSync(
        `${testDir}/tsconfig.json`,
        JSON.stringify({
          glint: {
            environment: './local-env',
          },
        })
      );

      expect(loadConfigFromProject(testDir).rootDir).toBe(normalizePath(testDir));
    });

    test('loads from a jsconfig.json in a folder', () => {
      fs.writeFileSync(
        `${testDir}/jsconfig.json`,
        JSON.stringify({
          glint: {
            environment: './local-env',
          },
        })
      );

      expect(loadConfigFromProject(testDir).rootDir).toBe(normalizePath(testDir));
    });

    test('loads from a file', () => {
      fs.writeFileSync(
        `${testDir}/tsconfig.custom.json`,
        JSON.stringify({
          glint: {
            environment: './local-env',
          },
        })
      );

      expect(loadConfigFromProject(`${testDir}/tsconfig.custom.json`).rootDir).toBe(
        normalizePath(testDir)
      );
    });

    test('does not search parent directories', () => {
      fs.mkdirSync(`${testDir}/sub`, { recursive: true });
      fs.writeFileSync(
        `${testDir}/tsconfig.json`,
        JSON.stringify({
          glint: {
            environment: 'kaboom',
            checkStandaloneTemplates: false,
          },
        })
      );

      expect(() => loadConfigFromProject(`${testDir}/sub`)).toThrow(
        `Unable to find Glint configuration for project ${testDir}`
      );
    });
  });
});
