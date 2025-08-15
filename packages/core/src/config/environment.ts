import * as path from 'node:path';
import { createRequire } from 'node:module';
import escapeStringRegexp from 'escape-string-regexp';
import SilentError from 'silent-error';
import {
  GlintEnvironmentConfig,
  GlintExtensionConfig,
  GlintExtensionsConfig,
  GlintTagsConfig,
  SourceKind,
} from '@glint/core/config-types';

const require = createRequire(import.meta.url);

export const DEFAULT_EXTENSIONS: GlintExtensionsConfig = {
  '.js': { kind: 'untyped-script' },
  '.ts': { kind: 'typed-script' },
};

/**
 * A GlintEnvironment represents the _merged_ configurations of one or more
 * glint environments (e.g. ember-loose and ember-template-imports).
 */
export class GlintEnvironment {
  private tagConfig: GlintTagsConfig;
  private extensionsConfig: GlintExtensionsConfig;

  private tagImportRegexp: RegExp;

  public constructor(
    public readonly names: Array<string>,
    config: GlintEnvironmentConfig,
  ) {
    this.tagConfig = config.tags ?? {};
    // when is this populated? what is config?
    this.extensionsConfig = config.extensions ?? {};

    this.tagImportRegexp = this.buildTagImportRegexp();
  }

  public static load(
    specifier: string | Array<string> | Record<string, unknown>,
    { rootDir = process.cwd() } = {},
  ): GlintEnvironment {
    let envs = normalizeEnvironmentSpecifier(specifier);
    let config = loadMergedEnvironmentConfig(envs, rootDir);
    return new GlintEnvironment(Object.keys(envs), config);
  }

  public getSourceKind(fileName: string): SourceKind | 'unknown' {
    let extension = path.extname(fileName);
    return this.extensionsConfig[extension]?.kind ?? 'unknown';
  }

  public isTypedScript(path: string): boolean {
    return this.getSourceKind(path) === 'typed-script';
  }

  public isUntypedScript(path: string): boolean {
    return this.getSourceKind(path) === 'untyped-script';
  }

  public isScript(path: string): boolean {
    let kind = this.getSourceKind(path);
    return kind === 'typed-script' || kind === 'untyped-script';
  }



  /**
   * Returns an array of custom file extensions that the active environment
   * is able to handle.
   */
  public getConfiguredFileExtensions(): Array<string> {
    return Object.keys(this.extensionsConfig);
  }

  /**
   * Returns any custom configuration for the given file extension.
   */
  public getConfigForExtension(extension: string): GlintExtensionConfig | undefined {
    return this.extensionsConfig[extension];
  }







  /**
   * Indicates whether the given module _may_ have embedded templates in it.
   *
   * Note that this method is intended to be a cheaper initial pass to avoid needlessly
   * parsing modules that definitely don't require rewriting. It therefore may produce
   * false positives, but should never give a false negative.
   */
  public moduleMayHaveEmbeddedTemplates(modulePath: string, moduleContents: string): boolean {
    let config = this.getConfigForExtension(path.extname(modulePath));
    return Boolean(
      config?.preprocess || config?.transform || this.tagImportRegexp.test(moduleContents),
    );
  }

  /**
   * Returns an array of template tags that should be rewritten according to this
   * config object, along with an import specifier indicating where the template types
   * for each tag can be found.
   */
  public getConfiguredTemplateTags(): GlintTagsConfig {
    return this.tagConfig;
  }

  private buildTagImportRegexp(): RegExp {
    let importSources = Object.keys(this.tagConfig);
    let regexpSource = importSources.map(escapeStringRegexp).join('|');
    return new RegExp(regexpSource);
  }
}

function normalizeEnvironmentSpecifier(
  specifier: string | string[] | Record<string, unknown>,
): Record<string, unknown> {
  if (typeof specifier === 'string') {
    return { [specifier]: null };
  } else if (Array.isArray(specifier)) {
    return specifier.reduce((obj, name) => ({ ...obj, [name]: null }), {});
  }

  return specifier;
}

function loadMergedEnvironmentConfig(
  envs: Record<string, unknown>,
  rootDir: string,
): GlintEnvironmentConfig {
  let tags: GlintTagsConfig = {};
  let extensions: GlintExtensionsConfig = { ...DEFAULT_EXTENSIONS };
  for (let [envName, envUserConfig] of Object.entries(envs)) {
    let envPath = locateEnvironment(envName, rootDir);
    let envModule = require(envPath);
    let envFunction = envModule?.default ?? envModule;
    if (typeof envFunction !== 'function') {
      throw new SilentError(
        `The specified environment '${envName}', which was loaded from ${envPath}, ` +
          `does not appear to be a Glint environment package.`,
      );
    }

    let config = envFunction(envUserConfig ?? {}) as GlintEnvironmentConfig;

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
  }

  return { tags, extensions };
}

function locateEnvironment(name: string, basedir: string): string {
  let require = createRequire(path.resolve(basedir, 'package.json'));

  for (let candidate of [
    // 1st-party package name shorthand
    `@glint/environment-${name}/glint-environment-definition`,
    // 3rd-party package name shorthand
    `glint-environment-${name}/glint-environment-definition`,
    // Full package name
    `${name}/glint-environment-definition`,
    // Literal file path
    name,
  ]) {
    try {
      return require.resolve(candidate);
    } catch (error: any) {
      if (error?.code !== 'MODULE_NOT_FOUND') {
        throw error;
      }
    }
  }

  throw new SilentError(`Unable to resolve environment '${name}' from ${basedir}`);
}


