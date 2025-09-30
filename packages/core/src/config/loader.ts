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
    if (!configPath) return null;

    let existing = this.configs.get(configPath);
    if (existing !== undefined) return existing;

    let configInput = loadConfigInput(ts, configPath);
    let config = new GlintConfig(ts, configPath, configInput || { environment: [] });

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
