import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { parse } from 'json5';
import { afterEach, beforeEach, describe, test, expect } from 'vitest';

import { migrate, normalizePathString } from '../src/lib/_migrate-glintrc.js';
import jsYaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.resolve(__dirname, '../../../../test-packages/ephemeral');

function makeTsconfig(inDir: string, content: unknown = VALID_TS_CONFIG): string {
  let tsconfigPath = path.join(inDir, 'tsconfig.json');
  fs.writeFileSync(tsconfigPath, JSON.stringify(content));
  return tsconfigPath;
}

function readTsconfig(tsconfigPath: string): string {
  return parse(fs.readFileSync(tsconfigPath, { encoding: 'utf-8' }));
}

function makeGlintrc(inDir: string, content: unknown): string {
  let rcPath = path.join(inDir, '.glintrc.yml');
  fs.writeFileSync(rcPath, jsYaml.dump(content));
  return rcPath;
}

// Minimally useful configs
const VALID_TS_CONFIG = {};
const INVALID_TS_CONFIG = ['a load of nonsense'];
const VALID_GLINT_RC = { environment: 'test' };
const INVALID_GLINT_RC = ['even more nonsense'];

describe('migrate-glintrc', () => {
  let projectDir!: string;
  beforeEach(() => {
    projectDir = path.join(ROOT, Math.random().toString(16).slice(2));
    fs.rmSync(projectDir, { recursive: true, force: true });
    fs.mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  describe('valid configs', () => {
    describe('`environment`', () => {
      test('with a single string for environment', async () => {
        let config = {
          environment: 'simple',
        };

        let rcPath = makeGlintrc(projectDir, config);
        let tsconfigPath = makeTsconfig(projectDir);

        let result = await migrate([rcPath]);

        expect(result.successes.length).toBe(1);
        let migrated = readTsconfig(tsconfigPath);
        expect(migrated).toMatchObject({
          glint: {
            environment: config.environment,
          },
        });
      });

      test('with a list of environments', async () => {
        let config = {
          environment: ['complicated', 'but-useful'],
        };

        let rcPath = makeGlintrc(projectDir, config);
        let tsconfigPath = makeTsconfig(projectDir);

        let result = await migrate([rcPath]);

        expect(result.successes.length).toBe(1);
        let migrated = readTsconfig(tsconfigPath);
        expect(migrated).toMatchObject({
          glint: {
            environment: config.environment,
          },
        });
      });

      describe('as objects', () => {
        describe('with a single environment', async () => {
          test('which is empty', async () => {
            let config = {
              environment: {
                complicated: {},
              },
            };

            let rcPath = makeGlintrc(projectDir, config);
            let tsconfigPath = makeTsconfig(projectDir);

            let result = await migrate([rcPath]);

            expect(result.successes.length).toBe(1);
            let migrated = readTsconfig(tsconfigPath);
            expect(migrated).toMatchObject({
              glint: {
                environment: config.environment,
              },
            });
          });

          test('which is populated', async () => {
            let config = {
              environment: {
                complicated: {
                  additionalGlobals: ['yeppers', 'peppers'],
                },
              },
            };

            let rcPath = makeGlintrc(projectDir, config);
            let tsconfigPath = makeTsconfig(projectDir);

            let result = await migrate([rcPath]);

            expect(result.successes.length).toBe(1);
            let migrated = readTsconfig(tsconfigPath);
            expect(migrated).toMatchObject({
              glint: {
                environment: config.environment,
              },
            });
          });
        });

        describe('with multiple environments', () => {
          test('where both are empty', async () => {
            let config = {
              environment: {
                complicated: {},
                'but-useful': {},
              },
            };

            let rcPath = makeGlintrc(projectDir, config);
            let tsconfigPath = makeTsconfig(projectDir);

            let result = await migrate([rcPath]);

            expect(result.successes.length).toBe(1);
            let migrated = readTsconfig(tsconfigPath);
            expect(migrated).toMatchObject({
              glint: {
                environment: config.environment,
              },
            });
          });

          test('where one is populated', async () => {
            let config = {
              environment: {
                complicated: {
                  additionalGlobals: ['yeppers', 'peppers'],
                },
                'but-useful': {},
              },
            };

            let rcPath = makeGlintrc(projectDir, config);
            let tsconfigPath = makeTsconfig(projectDir);

            let result = await migrate([rcPath]);

            expect(result.successes.length).toBe(1);
            let migrated = readTsconfig(tsconfigPath);
            expect(migrated).toMatchObject({
              glint: {
                environment: config.environment,
              },
            });
          });

          test('where both are populated', async () => {
            let config = {
              environment: {
                complicated: {
                  additionalGlobals: ['yeppers', 'peppers'],
                },
                'but-useful': {},
              },
            };

            let rcPath = makeGlintrc(projectDir, config);
            let tsconfigPath = makeTsconfig(projectDir);

            let result = await migrate([rcPath]);

            expect(result.successes.length).toBe(1);
            let migrated = readTsconfig(tsconfigPath);
            expect(migrated).toMatchObject({
              glint: {
                environment: config.environment,
              },
            });
          });
        });
      });
    });

    describe('`transforms`', async () => {
      test('with just `include`', async () => {
        let config = {
          include: ['a', 'b'],
        };

        let rcPath = makeGlintrc(projectDir, config);
        let tsconfigPath = makeTsconfig(projectDir);

        let result = await migrate([rcPath]);

        expect(result.successes.length).toBe(1);
        let migrated = readTsconfig(tsconfigPath);
        expect(migrated).toMatchObject({
          glint: {
            transform: {
              include: config.include,
            },
          },
        });
      });

      test('with just `exclude`', async () => {
        let config = {
          exclude: ['c', 'd'],
        };

        let rcPath = makeGlintrc(projectDir, config);
        let tsconfigPath = makeTsconfig(projectDir);

        let result = await migrate([rcPath]);

        expect(result.successes.length).toBe(1);
        let migrated = readTsconfig(tsconfigPath);
        expect(migrated).toMatchObject({
          glint: {
            transform: {
              exclude: config.exclude,
            },
          },
        });
      });

      test('with both `include` and `exclude`', async () => {
        let config = {
          include: ['a', 'b'],
          exclude: ['c', 'd'],
        };

        let rcPath = makeGlintrc(projectDir, config);
        let tsconfigPath = makeTsconfig(projectDir);

        let result = await migrate([rcPath]);

        expect(result.successes.length).toBe(1);
        let migrated = readTsconfig(tsconfigPath);
        expect(migrated).toMatchObject({
          glint: {
            transform: {
              exclude: config.exclude,
            },
          },
        });
      });
    });

    test('smoke test a full config', async () => {
      let config = {
        environment: {
          'ember-loose': {},
          glimmerx: {
            additionalGlobals: ['fun-fun'],
          },
        },
        checkStandaloneTemplates: false,
        include: ['a', 'b'],
        exclude: ['c', 'd'],
      };

      let rcPath = makeGlintrc(projectDir, config);
      let tsconfigPath = makeTsconfig(projectDir);

      let result = await migrate([rcPath]);

      expect(result.successes.length).toBe(1);
      let migrated = readTsconfig(tsconfigPath);
      expect(migrated).toMatchObject({
        glint: {
          environment: config.environment,
          checkStandaloneTemplates: config.checkStandaloneTemplates,
          transform: {
            include: config.include,
            exclude: config.exclude,
          },
        },
      });
    });
  });

  describe('error reporting', () => {
    test('when there are no config files supplied', async () => {
      let result = await migrate([]);
      expect(result.failures.length).toBe(1);
      expect(result.failures[0]).toMatch('you must supply at least one path');
    });

    test('when both configs are empty', async () => {
      let tsconfigPath = makeTsconfig(projectDir);
      let rcPath = makeGlintrc(projectDir, '');

      let { successes, failures } = await migrate([rcPath]);
      expect(successes.length).toBe(0);
      expect(failures.length).toBe(1);
      expect(failures[0]).toMatch('Could not parse data as a Glint config');

      let tsconfig = readTsconfig(tsconfigPath);
      expect(tsconfig).not.toHaveProperty('glint');
    });

    test('when the .glintrc.yml', async () => {
      let tsconfigPath = makeTsconfig(projectDir);
      let rcPath = makeGlintrc(projectDir, { environment: 123 });

      let { successes, failures } = await migrate([rcPath]);
      expect(successes.length).toBe(0);
      expect(failures.length).toBe(1);
      expect(failures[0]).toMatch('Could not parse data as a Glint config');
      expect(failures[0]).toMatch(normalizePathString(rcPath));

      let tsconfig = readTsconfig(tsconfigPath);
      expect(tsconfig).not.toHaveProperty('glint');
    });

    describe('for invalid config files', () => {
      test('when tsconfig.json is invalid', async () => {
        let tsconfigPath = makeTsconfig(projectDir, INVALID_TS_CONFIG);
        let rcPath = makeGlintrc(projectDir, VALID_GLINT_RC);

        let { successes, failures } = await migrate([rcPath]);
        expect(successes.length).toBe(0);
        expect(failures.length).toBe(1);
        expect(failures[0]).toMatch('invalid contents of tsconfig.json file');

        let tsconfig = readTsconfig(tsconfigPath);
        expect(tsconfig).not.toHaveProperty('glint');
      });

      test('when .glintrc.yml is invalid', async () => {
        let tsconfigPath = makeTsconfig(projectDir, VALID_TS_CONFIG);
        let rcPath = makeGlintrc(projectDir, INVALID_GLINT_RC);

        let { successes, failures } = await migrate([rcPath]);
        expect(successes.length).toBe(0);
        expect(failures.length).toBe(1);
        expect(failures[0]).toMatch('Could not parse data as a Glint config');

        let tsconfig = readTsconfig(tsconfigPath);
        expect(tsconfig).not.toHaveProperty('glint');
      });

      test('when both .glintrc.yml and tsconfig.json files are invalid', async () => {
        let tsconfigPath = makeTsconfig(projectDir, INVALID_TS_CONFIG);
        let rcPath = makeGlintrc(projectDir, INVALID_GLINT_RC);

        let { successes, failures } = await migrate([rcPath]);
        expect(successes.length).toBe(0);
        expect(failures.length).toBe(1);
        expect(failures[0]).toMatch('Could not parse data as a Glint config');

        let tsconfig = readTsconfig(tsconfigPath);
        expect(tsconfig).not.toHaveProperty('glint');
      });
    });
  });

  describe('multiple configs', async () => {
    let nestedDir!: string;
    beforeEach(() => {
      nestedDir = path.join(projectDir, Math.random().toString(16).slice(2));
      fs.rmSync(nestedDir, { recursive: true, force: true });
      fs.mkdirSync(nestedDir, { recursive: true });
    });

    afterEach(() => {
      fs.rmSync(nestedDir, { recursive: true, force: true });
    });

    test('two valid configs', async () => {
      let rootTsconfigPath = makeTsconfig(projectDir);
      let nestedTsconfigPath = makeTsconfig(nestedDir);

      let rootGlintrc = makeGlintrc(projectDir, VALID_GLINT_RC);
      let nestedGlintrc = makeGlintrc(nestedDir, VALID_GLINT_RC);

      let { successes, failures } = await migrate([rootGlintrc, nestedGlintrc]);

      expect(successes.length).toBe(2);
      expect(failures.length).toBe(0);

      let rootTsconfig = readTsconfig(rootTsconfigPath);
      expect(rootTsconfig).toHaveProperty('glint');

      let nestedTsconfig = readTsconfig(nestedTsconfigPath);
      expect(nestedTsconfig).toHaveProperty('glint');
    });

    test('two invalid configs', async () => {
      let rootTsconfigPath = makeTsconfig(projectDir);
      let nestedTsconfigPath = makeTsconfig(nestedDir);

      let rootGlintrc = makeGlintrc(projectDir, INVALID_GLINT_RC);
      let nestedGlintrc = makeGlintrc(nestedDir, INVALID_GLINT_RC);

      let { successes, failures } = await migrate([rootGlintrc, nestedGlintrc]);

      expect(successes.length).toBe(0);
      expect(failures.length).toBe(2);

      let rootTsconfig = readTsconfig(rootTsconfigPath);
      expect(rootTsconfig).not.toHaveProperty('glint');

      let nestedTsconfig = readTsconfig(nestedTsconfigPath);
      expect(nestedTsconfig).not.toHaveProperty('glint');
    });

    describe('mixed validity', () => {
      test('valid root, invalid nested', async () => {
        let rootTsconfigPath = makeTsconfig(projectDir);
        let nestedTsconfigPath = makeTsconfig(nestedDir);

        let rootGlintrc = makeGlintrc(projectDir, VALID_GLINT_RC);
        let nestedGlintrc = makeGlintrc(nestedDir, INVALID_GLINT_RC);

        let { successes, failures } = await migrate([rootGlintrc, nestedGlintrc]);

        expect(successes.length).toBe(1);
        expect(failures.length).toBe(1);

        let rootTsconfig = readTsconfig(rootTsconfigPath);
        expect(rootTsconfig).toHaveProperty('glint');

        let nestedTsconfig = readTsconfig(nestedTsconfigPath);
        expect(nestedTsconfig).not.toHaveProperty('glint');
      });

      test('invalid root, valid nested', async () => {
        let rootTsconfigPath = makeTsconfig(projectDir);
        let nestedTsconfigPath = makeTsconfig(nestedDir);

        let rootGlintrc = makeGlintrc(projectDir, INVALID_GLINT_RC);
        let nestedGlintrc = makeGlintrc(nestedDir, VALID_GLINT_RC);

        let { successes, failures } = await migrate([rootGlintrc, nestedGlintrc]);

        expect(successes.length).toBe(1);
        expect(failures.length).toBe(1);

        let rootTsconfig = readTsconfig(rootTsconfigPath);
        expect(rootTsconfig).not.toHaveProperty('glint');

        let nestedTsconfig = readTsconfig(nestedTsconfigPath);
        expect(nestedTsconfig).toHaveProperty('glint');
      });
    });
  });
});
