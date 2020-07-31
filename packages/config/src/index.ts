import path from 'path';
import { cosmiconfigSync } from 'cosmiconfig';
import { GlintConfig } from './config';

export { GlintConfig } from './config';
export { GlintEnvironment, GlintEnvironmentConfig } from './environment';

/**
 * Loads glint configuration, starting from the given directory
 * and searching upwards.
 */
export function loadConfig(from: string): GlintConfig {
  let result = cosmiconfigSync('glint').search(from);
  if (result) {
    return new GlintConfig(path.dirname(result.filepath), result.config);
  }

  throw new Error(`Unable to find Glint configuration for ${from}`);
}
