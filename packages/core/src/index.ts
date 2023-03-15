import { GlintConfig, loadConfig } from './config/index.js';
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
export function analyzeProject(projectDirectory: string = process.cwd()): ProjectAnalysis {
  let glintConfig = loadConfig(projectDirectory);
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

export type { TransformManager, GlintConfig, GlintLanguageServer };
