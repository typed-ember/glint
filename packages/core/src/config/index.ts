import SilentError from 'silent-error';
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
export function findConfig(from: string): GlintConfig | null {
  return new ConfigLoader().configForDirectory(from);
}
