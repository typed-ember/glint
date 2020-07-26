import path from 'path';
import { cosmiconfigSync } from 'cosmiconfig';
import { GlintConfig } from './config';

/**
 * Loads glint configuration, starting from the given directory
 * and searching upwards.
 */
export function loadConfig(from: string): GlintConfig {
  let result = cosmiconfigSync('glint').search(from);
  if (result) {
    return new GlintConfig(path.dirname(result.filepath), result.config);
  }

  return new GlintConfig(from);
}


