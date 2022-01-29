import path from 'path';
import { cosmiconfigSync } from 'cosmiconfig';
import { GlintConfig } from './config';

export { GlintConfig } from './config';
export {
  GlintEnvironment,
  GlintEnvironmentConfig,
  GlintTagConfig,
  GlintExtensionPreprocess,
  GlintExtensionTransform,
  PathCandidate,
} from './environment';

/**
 * Loads glint configuration, starting from the given directory
 * and searching upwards and raising an error if no configuration
 * is found.
 */
export function loadConfig(from: string): GlintConfig {
  let config = findConfig(from);
  if (!config) {
    throw new Error(`Unable to find Glint configuration for ${from}`);
  }

  return config;
}

/**
 * Loads glint configuration, starting from the given directory
 * and searching upwards. Returns `null` if no configuration is
 * found.
 */
export function findConfig(from: string): GlintConfig | null {
  let result = cosmiconfigSync('glint').search(from);
  if (result) {
    return new GlintConfig(path.dirname(result.filepath), result.config);
  }

  return null;
}
