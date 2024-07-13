import { GlintConfig, loadConfig, findConfig } from './config/index.js';
import * as utils from './language-server/util/index.js';
import { createEmberLanguagePlugin } from './volar/ember-language-plugin.js';

/** @internal */
export const pathUtils = utils;

export { loadConfig, findConfig, createEmberLanguagePlugin };

export type { GlintConfig };
