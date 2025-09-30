import {
  GlintEnvironmentConfig,
  GlintExtensionConfig,
  GlintExtensionsConfig,
  GlintTagsConfig,
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
  private tagConfig: GlintTagsConfig;
  private extensionsConfig: GlintExtensionsConfig;

  public constructor(
    public readonly names: Array<string>,
    config: GlintEnvironmentConfig,
  ) {
    this.tagConfig = config.tags ?? {};
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

    let tags: GlintTagsConfig = {};
    let extensions: GlintExtensionsConfig = { ...DEFAULT_EXTENSIONS };

    const envUserConfig = { additionalGlobals, additionalSpecialForms };

    let config = emberTemplateImportsEnvironment(envUserConfig) as GlintEnvironmentConfig;

    if (config.tags) {
      for (let [importSource, specifiers] of Object.entries(config.tags)) {
        tags[importSource] ??= {};
        for (let [importSpecifier, tagConfig] of Object.entries(specifiers)) {
          if (importSpecifier in tags[importSource]) {
            throw new SilentError(
              'Multiple configured Glint environments attempted to define behavior for the tag `' +
                importSpecifier +
                "` in module '" +
                importSource +
                "'.",
            );
          }

          tags[importSource][importSpecifier] = tagConfig;
        }
      }
    }

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

    return new GlintEnvironment(Object.keys(config), { tags, extensions });
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
   * Returns an array of template tags that should be rewritten according to this
   * config object, along with an import specifier indicating where the template types
   * for each tag can be found.
   */
  public getConfiguredTemplateTags(): GlintTagsConfig {
    return this.tagConfig;
  }
}
