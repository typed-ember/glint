import * as path from 'node:path';
import SilentError from 'silent-error';
import type TS from 'typescript';
import { GlintConfig } from './config.js';
import { ConfigLoader } from './loader.js';

export { GlintConfig } from './config.js';
export { GlintEnvironment } from './environment.js';
export { ConfigLoader, findTypeScript } from './loader.js';

/**
 * Loads glint configuration, starting from the given directory
 * and searching upwards and raising an error if no configuration
 * is found.
 */
export function loadConfig(from: string): GlintConfig {
  let config = findConfig(from);
  if (!config) {
    throw new SilentError(`Unable to find Glint configuration for ${from}`);
  }

  return config;
}

/**
 * Loads glint configuration, starting from the given directory
 * and searching upwards. Returns `null` if no configuration is
 * found.
 */
export function findConfig(from: string, fallbackTs?: typeof TS): GlintConfig | null {
  return new ConfigLoader(undefined, fallbackTs).configForDirectory(from);
}

/**
 * Creates a default GlintConfig with ember-template-imports environment
 * for use when no tsconfig.json or jsconfig.json exists. This enables
 * Glint to provide IntelliSense in JavaScript-only Ember projects.
 */
export function createDefaultConfig(ts: typeof TS, rootDir: string): GlintConfig {
  const syntheticConfigPath = path.join(rootDir, 'jsconfig.json');
  return new GlintConfig(ts, syntheticConfigPath, { environment: 'ember-template-imports' });
}
