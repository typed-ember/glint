import { GlintConfig, loadConfig, findConfig } from './config/index.js';
import { createEmberLanguagePlugin } from './volar/ember-language-plugin.js';

import { VirtualGtsCode } from './volar/gts-virtual-code.js';
import { LooseModeBackingComponentClassVirtualCode } from './volar/loose-mode-backing-component-class-virtual-code.js';
import { augmentDiagnostics } from './transform/diagnostics/augmentation.js';

export {
  loadConfig,
  findConfig,
  createEmberLanguagePlugin,
  VirtualGtsCode,
  LooseModeBackingComponentClassVirtualCode,
  augmentDiagnostics,
};

export type { GlintConfig };
