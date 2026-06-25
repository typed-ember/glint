import {
  GlintEnvironmentConfig,
  GlintExtensionConfig,
  GlintExtensionsConfig,
  GlintTemplateConfig,
  SourceKind,
} from '@glint/ember-tsc/config-types';
import * as path from 'node:path';
import SilentError from 'silent-error';

import emberTemplateImportsEnvironment from '../environment-ember-template-imports/-private/environment/index.js';

export const DEFAULT_EXTENSIONS: GlintExtensionsConfig = {
  '.js': { kind: 'untyped-script' },
  '.ts': { kind: 'typed-script' },
};

/**
 * A GlintEnvironment represents the _merged_ configurations of one or more
 * glint environments (e.g. ember-template-imports).
 */
export class GlintEnvironment {
  private templateConfig: GlintTemplateConfig | undefined;
  private extensionsConfig: GlintExtensionsConfig;

  public constructor(
    public readonly names: Array<string>,
    config: GlintEnvironmentConfig,
  ) {
    this.templateConfig = config.template;
    // when is this populated? what is config?
    this.extensionsConfig = config.extensions ?? {};
  }

  public static load(topLevelGlintConfigObject: any): GlintEnvironment {
    // Glint V1:
    let additionalGlobals = null;
    let additionalSpecialForms = {};
    if (topLevelGlintConfigObject) {
      if (
        topLevelGlintConfigObject.additionalGlobals ||
        topLevelGlintConfigObject.additionalSpecialForms
      ) {
        additionalGlobals = topLevelGlintConfigObject.additionalGlobals;
        additionalSpecialForms = topLevelGlintConfigObject.additionalSpecialForms ?? {};
      } else {
        if (Array.isArray(topLevelGlintConfigObject.environment)) {
          // If it's a legacy array of environment names, e.g. ['ember-template-imports', 'ember-loose'],
          // then there is no additional config such as additionalGlobals to extract.
        } else {
          if (typeof topLevelGlintConfigObject.environment === 'object') {
            const emberTemplateImportsConfig =
              topLevelGlintConfigObject.environment?.['ember-template-imports'] ?? {};
            additionalGlobals = emberTemplateImportsConfig.additionalGlobals ?? [];
            additionalSpecialForms = emberTemplateImportsConfig.additionalSpecialForms ?? {};
          }
        }
      }
    }

    let extensions: GlintExtensionsConfig = { ...DEFAULT_EXTENSIONS };

    const envUserConfig = { additionalGlobals, additionalSpecialForms };

    let config = emberTemplateImportsEnvironment(envUserConfig) as GlintEnvironmentConfig;

    if (config.extensions) {
      for (let [extension, extensionConfig] of Object.entries(config.extensions)) {
        if (extension in extensions) {
          throw new SilentError(
            'Multiple configured Glint environments attempted to define handling for the ' +
              extension +
              ' file extension.',
          );
        }

        extensions[extension] = extensionConfig;
      }
    }

    return new GlintEnvironment(Object.keys(config), { template: config.template, extensions });
  }

  public getSourceKind(fileName: string): SourceKind | 'unknown' {
    let extension = path.extname(fileName);
    return this.extensionsConfig[extension]?.kind ?? 'unknown';
  }

  public isUntypedScript(path: string): boolean {
    return this.getSourceKind(path) === 'untyped-script';
  }

  /**
   * Returns any custom configuration for the given file extension.
   */
  public getConfigForExtension(extension: string): GlintExtensionConfig | undefined {
    return this.extensionsConfig[extension];
  }

  /**
   * Returns the configuration for the built-in `<template>` form — the types
   * module its transformed output references, plus the keyword globals and
   * special forms available inside it. Returns `undefined` if the active
   * environment defines no template form.
   */
  public getTemplateConfig(): GlintTemplateConfig | undefined {
    return this.templateConfig;
  }
}
