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
  private logInfo?: (message: string) => void;

  constructor(logInfo?: (message: string) => void) {
    this.logInfo = logInfo;
  }

  private log(message: string): void {
    this.logInfo?.(message);
  }

  public configForFile(filePath: string): GlintConfig | null {
    return this.configForDirectory(path.dirname(filePath));
  }

  public configForDirectory(directory: string): GlintConfig | null {
    let ts = findTypeScript(directory);
    if (!ts) {
      this.log(`No TypeScript installation found from ${directory}.`);
      return null;
    }

    // Log TypeScript resolution for synthetic/special paths to aid debugging
    if (directory === '/dev/null' || directory.includes('/dev/null')) {
      this.log(
        `Resolved TypeScript for inferred project (${directory}) using fallback resolution.`,
      );
    }

    let configPath = findNearestConfigFile(ts, directory);

    // If no tsconfig/jsconfig found, create a default config if the project has
    // glint-related dependencies (e.g. ember-source, @glint/template). This allows
    // the tsserver plugin and language server to still transform .gts/.gjs files
    // in projects that don't use a tsconfig/jsconfig.
    if (!configPath) {
      this.log(`No tsconfig.json or jsconfig.json found from ${directory}.`);

      if (hasGlintRelatedDependencies(directory)) {
        // Use a synthetic config path so GlintConfig can determine rootDir.
        // Find the nearest package.json directory to use as root.
        const rootDir = findNearestPackageJsonDir(directory) || directory;
        const syntheticConfigPath = path.join(rootDir, 'tsconfig.json');

        let existing = this.configs.get(syntheticConfigPath);
        if (existing !== undefined) {
          this.log(`Using cached default Glint config for ${rootDir}.`);
          return existing;
        }

        let config = new GlintConfig(ts, syntheticConfigPath, { environment: [] });
        this.log(`Created default Glint config for ${rootDir} (no tsconfig/jsconfig).`);
        this.configs.set(syntheticConfigPath, config);
        return config;
      }

      return null;
    }

    let existing = this.configs.get(configPath);
    if (existing !== undefined) {
      this.log(`Using cached Glint config from ${configPath}.`);
      return existing;
    }

    let configInput = loadConfigInput(ts, configPath);
    let config = new GlintConfig(ts, configPath, configInput || { environment: [] });

    this.log(`Loaded Glint config from ${configPath}.`);

    this.configs.set(configPath, config);

    return config;
  }
}

export function findTypeScript(fromDir: string): TypeScript | null {
  // Handle synthetic paths (like /dev/null from inferred projects) or non-existent directories
  // by trying alternative resolution strategies
  const isSyntheticPath = fromDir === '/dev/null' || fromDir.includes('/dev/null');
  const dirExists = !isSyntheticPath && fs.existsSync(fromDir);

  if (dirExists) {
    // Try to resolve from the given directory first
    const requireFrom = path.resolve(fromDir, 'package.json');
    const ts = tryResolve(() => createRequire(requireFrom)('typescript'));
    if (ts) return ts;
  }

  // Fallback strategies:
  // 1. Try from current working directory (useful for VS Code workspace context)
  const cwdTs = tryResolve(() =>
    createRequire(path.resolve(process.cwd(), 'package.json'))('typescript'),
  );
  if (cwdTs) return cwdTs;

  // 2. Try from the Glint module itself (will find VS Code's bundled TypeScript or workspace TypeScript)
  return tryResolve(() => require('typescript'));
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
 * Finds the nearest directory containing a package.json, searching upward
 * from the given directory.
 */
function findNearestPackageJsonDir(searchFrom: string): string | null {
  let currentDir = searchFrom;
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  return null;
}

/**
 * Checks if @glint/template or ember-source is present in the package.json
 * of the given directory or any parent directory.
 */
function hasGlintRelatedDependencies(searchFrom: string): boolean {
  // Handle synthetic paths (like /dev/null from inferred projects)
  // by searching from the current working directory instead
  if (
    searchFrom === '/dev/null' ||
    searchFrom.includes('/dev/null') ||
    !fs.existsSync(searchFrom)
  ) {
    searchFrom = process.cwd();
  }

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

        if (allDependencies['@glint/template'] || allDependencies['ember-source']) {
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
