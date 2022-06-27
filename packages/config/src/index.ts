import SilentError from 'silent-error';
import { GlintConfig } from './config';
import { ConfigLoader } from './loader';

export type { GlintConfig } from './config';
export type {
  GlintEnvironment,
  GlintEnvironmentConfig,
  GlintTagConfig,
  GlintExtensionPreprocess,
  GlintExtensionTransform,
  PathCandidate,
} from './environment';

export { ConfigLoader } from './loader';

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
