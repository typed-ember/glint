import { GlintConfig, loadClosestConfig, loadConfigFromProject } from './config/index.js';
import DocumentCache from './common/document-cache.js';
import TransformManager from './common/transform-manager.js';
import GlintLanguageServer from './language-server/glint-language-server.js';
import * as utils from './language-server/util/index.js';

/** @internal */
export interface ProjectAnalysis {
  glintConfig: GlintConfig;
  transformManager: TransformManager;
  languageServer: GlintLanguageServer;
  shutdown: () => void;
}

/** @internal */
export const pathUtils = utils;

/**
 * This function is available to consumers as an unstable API. We will not go
 * out of our way to change or break it, but there may be breaking changes
 * to its behavior or type signature outside of major version bumps.
 *
 * See the `auto-glint-nocheck` implementation in `@glint/scripts` for a
 * sample use of this API.
 *
 * @internal
 */
export function analyzeProject(from?: string): ProjectAnalysis {
  let glintConfig =
    from !== undefined ? loadConfigFromProject(from) : loadClosestConfig(process.cwd());
  let documents = new DocumentCache(glintConfig);
  let transformManager = new TransformManager(glintConfig, documents);
  let languageServer = new GlintLanguageServer(glintConfig, documents, transformManager);
  let shutdown = (): void => languageServer.dispose();

  return {
    glintConfig,
    transformManager,
    languageServer,
    shutdown,
  };
}

/**
 * Deprecated method to load the config -- use `loadConfigFromProject` instead.
 */
export function loadConfig(from: string): GlintConfig {
  console.warn(
    'DEPRECATION: `loadConfig` is deprecated. Use `loadClosestConfig` instead, or consider using `loadConfigFromProject`.'
  );
  return loadClosestConfig(from);
}

export { loadClosestConfig, loadConfigFromProject };

export type { TransformManager, GlintConfig, GlintLanguageServer };
