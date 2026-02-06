import { GlintConfigInput } from '@glint/ember-tsc/config-types';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import SilentError from 'silent-error';
import type TS from 'typescript';
import { GlintConfig } from './config.js';

/**
 * @private
 *
 * Only exported for testing purposes. Do not import.
 */
export const require = createRequire(import.meta.url);

type TypeScript = typeof TS;

/**
 * `ConfigLoader` provides an interface for finding the Glint config that
 * applies to a given file or directory, ensuring that only a single instance
 * of `GlintConfig` is ever created for a given `tsconfig.json` or
 * `jsconfig.json` source file.
 */
export class ConfigLoader {
  private configs = new Map<string, GlintConfig | null>();

  public configForFile(filePath: string): GlintConfig | null {
    return this.configForDirectory(path.dirname(filePath));
  }

  public configForDirectory(directory: string): GlintConfig | null {
    let ts = findTypeScript(directory);
    if (!ts) return null;

    let configPath = findNearestConfigFile(ts, directory);

    // If no tsconfig/jsconfig found, check if Glint-related dependencies are present
    if (!configPath) {
      if (!hasGlintRelatedDependencies(directory)) {
        return null;
      }

      // Found Glint-related dependencies but no config file
      // Create a synthetic config path for caching purposes
      const syntheticConfigPath = path.resolve(directory, '<synthetic-glint-config>');

      let existing = this.configs.get(syntheticConfigPath);
      if (existing !== undefined) return existing;

      // Return a minimal config with default ember-template-imports environment
      const config = new GlintConfig(ts, syntheticConfigPath, {
        environment: [],
      });

      this.configs.set(syntheticConfigPath, config);
      return config;
    }

    let existing = this.configs.get(configPath);
    if (existing !== undefined) return existing;

    let configInput = loadConfigInput(ts, configPath);

    // If config has no glint configuration, check for package.json dependencies
    // from the ORIGINAL search directory, not the config directory
    const shouldUseSyntheticConfig =
      !configInput ||
      !configInput.environment ||
      (Array.isArray(configInput.environment) && configInput.environment.length === 0);

    if (shouldUseSyntheticConfig) {
      if (hasGlintRelatedDependencies(directory)) {
        // Package has Glint dependencies but the found tsconfig has no glint config.
        // Create a synthetic config for this specific directory rather than using the parent tsconfig.
        const syntheticConfigPath = `<synthetic:${directory}>`;
        let syntheticExisting = this.configs.get(syntheticConfigPath);
        if (syntheticExisting !== undefined) return syntheticExisting;

        const syntheticConfig = new GlintConfig(
          ts,
          syntheticConfigPath,
          configInput ?? { environment: [] },
        );
        this.configs.set(syntheticConfigPath, syntheticConfig);
        return syntheticConfig;
      }
      // No dependencies found, cache null result for this tsconfig
      this.configs.set(configPath, null);
      return null;
    }

    let config = new GlintConfig(ts, configPath, configInput);

    this.configs.set(configPath, config);

    return config;
  }
}

export function findTypeScript(fromDir: string): TypeScript | null {
  let requireFrom = path.resolve(fromDir, 'package.json');
  return (
    tryResolve(() => createRequire(requireFrom)('typescript')) ??
    tryResolve(() => require('typescript'))
  );
}

function tryResolve<T>(load: () => T): T | null {
  try {
    return load();
  } catch (error: any) {
    if (error?.code === 'MODULE_NOT_FOUND') {
      return null;
    }

    throw error;
  }
}

function parseConfigInput(
  ts: TypeScript,
  entryPath: string,
  currentPath: string,
  fullGlintConfig: Record<string, unknown>,
): Record<string, unknown> {
  let currentContents: any = ts.readConfigFile(currentPath, ts.sys.readFile).config;
  let currentGlintConfig = currentContents.glint ?? {};

  assert(
    currentPath === entryPath || !currentGlintConfig.transform,
    'Glint `transform` options may not be specified in extended config.',
  );

  if (currentContents.extends) {
    let paths: string[] = Array.isArray(currentContents.extends)
      ? currentContents.extends
      : [currentContents.extends];
    for (let extendPath of paths) {
      let currentExtendPath = path.resolve(path.dirname(currentPath), extendPath);
      if (!fs.existsSync(currentExtendPath)) {
        try {
          currentExtendPath = require.resolve(currentContents.extends);
        } catch {
          // suppress the exception thrown by require.resolve for those scenarios where the file does not exist
        }
      }

      fullGlintConfig = parseConfigInput(ts, entryPath, currentExtendPath, fullGlintConfig);
    }
  }

  return { ...fullGlintConfig, ...currentGlintConfig };
}

export function loadConfigInput(ts: TypeScript, entryPath: string): GlintConfigInput | null {
  return validateConfigInput(parseConfigInput(ts, entryPath, entryPath, {}));
}

function findNearestConfigFile(ts: TypeScript, searchFrom: string): string {
  // Assume that the longest path is the most relevant one in the case that
  // multiple config files exist at or above our current directory.
  let configCandidates = [
    ts.findConfigFile(searchFrom, ts.sys.fileExists, 'tsconfig.json'),
    ts.findConfigFile(searchFrom, ts.sys.fileExists, 'jsconfig.json'),
  ]
    .filter((path): path is string => typeof path === 'string')
    .sort((a, b) => b.length - a.length);

  return configCandidates[0];
}

/**
 * Checks if @glint/template or ember-source is present in the package.json
 * and requires @glint/ember-tsc to be present.
 * of the given directory or any parent directory.
 */
function hasGlintRelatedDependencies(searchFrom: string): boolean {
  let currentDir = searchFrom;
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const packageJsonPath = path.join(currentDir, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      try {
        const content = fs.readFileSync(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(content);

        const allDependencies = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
          ...packageJson.peerDependencies,
          ...packageJson.optionalDependencies,
        };

        const hasGlintTemplateOrEmberSource =
          allDependencies['@glint/template'] || allDependencies['ember-source'];
        const hasGlintEmberTsc = allDependencies['@glint/ember-tsc'];

        if (hasGlintTemplateOrEmberSource && hasGlintEmberTsc) {
          return true;
        }
      } catch {
        // Ignore parsing errors and continue searching
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      break;
    }
    currentDir = parentDir;
  }

  return false;
}

function validateConfigInput(input: Record<string, unknown>): GlintConfigInput | null {
  if (!input['environment']) {
    input['environment'] = [];
  }

  assert(
    Array.isArray(input['environment'])
      ? input['environment'].every((env) => typeof env === 'string')
      : typeof input['environment'] === 'string' ||
          (typeof input['environment'] === 'object' && input['environment']),
    'Glint config must specify an `environment` that is a string, array of strings, or an object ' +
      'mapping environment names to their config.',
  );

  return input as GlintConfigInput;
}

function assert(test: unknown, message: string): asserts test {
  if (!test) {
    throw new SilentError(`Glint config: ${message}`);
  }
}
