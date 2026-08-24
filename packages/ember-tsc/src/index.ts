import { GlintConfig, loadConfig, findConfig, createDefaultConfig } from './config/index.js';
import { createEmberLanguagePlugin } from './volar/ember-language-plugin.js';

import { VirtualGtsCode } from './volar/gts-virtual-code.js';
import { augmentDiagnostics } from './transform/diagnostics/augmentation.js';
import { getTransformErrorDiagnostics } from './transform/diagnostics/transform-errors.js';
import { rewriteModuleStandalone } from './transform/template/rewrite-module-standalone.js';

export {
  loadConfig,
  findConfig,
  createDefaultConfig,
  createEmberLanguagePlugin,
  VirtualGtsCode,
  augmentDiagnostics,
  getTransformErrorDiagnostics,
  rewriteModuleStandalone,
};

export type { GlintConfig };
