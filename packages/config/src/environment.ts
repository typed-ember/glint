import * as path from 'node:path';
import resolve = require('resolve');
import escapeStringRegexp = require('escape-string-regexp');
import type * as ts from 'typescript';
import SilentError = require('silent-error');

type TSLib = typeof ts;

export const DEFAULT_EXTENSIONS: GlintExtensionsConfig = {
  '.hbs': { kind: 'template' },
  '.js': { kind: 'untyped-script' },
  '.ts': { kind: 'typed-script' },
};

export type GlintEnvironmentConfig = {
  tags?: GlintTagsConfig;
  template?: GlintTemplateConfig;
  extensions?: GlintExtensionsConfig;
};

export type GlintExtensionPreprocess<T> = (
  source: string,
  filePath: string
) => { contents: string; data?: T };

export type GlintEmitMetadata = {
  prepend?: string;
  append?: string;
  templateLocation?: {
    start: number;
    end: number;
    contentStart: number;
    contentEnd: number;
  };
};

export type GlintExtensionTransform<T> = (
  data: T,
  state: {
    ts: TSLib;
    context: ts.TransformationContext;
    setEmitMetadata: (node: ts.TaggedTemplateExpression, meta: GlintEmitMetadata) => void;
  }
) => ts.Transformer<ts.Node>;

export type SourceKind = 'typed-script' | 'untyped-script' | 'template';
export type GlintExtensionConfig<PreprocessData = any> = {
  kind: SourceKind;
  preprocess?: GlintExtensionPreprocess<PreprocessData>;
  transform?: GlintExtensionTransform<PreprocessData>;
};

export type GlintExtensionsConfig = {
  [extension: string]: GlintExtensionConfig;
};

export type GlintTagConfig = {
  typesModule: string;
  globals?: Array<string>;
};

export type GlintTagsConfig = {
  [importSource: string]: {
    [importSpecifier: string]: GlintTagConfig;
  };
};

export type PathCandidate = string | PathCandidateWithDeferral;
export type PathCandidateWithDeferral = {
  /** The path to be considered. */
  path: string;

  /** Other paths which, if present, should be preferred to this one. */
  deferTo: Array<string>;
};

export type GlintTemplateConfig = {
  typesModule: string;
  getPossibleTemplatePaths(scriptPath: string): Array<PathCandidate>;
  getPossibleScriptPaths(templatePath: string): Array<PathCandidate>;
};

export class GlintEnvironment {
  private tagConfig: GlintTagsConfig;
  private extensionsConfig: GlintExtensionsConfig;
  private standaloneTemplateConfig: GlintTemplateConfig | undefined;
  private tagImportRegexp: RegExp;

  public typedScriptExtensions: ReadonlyArray<string>;
  public untypedScriptExtensions: ReadonlyArray<string>;
  public templateExtensions: ReadonlyArray<string>;

  public constructor(public readonly names: Array<string>, config: GlintEnvironmentConfig) {
    this.tagConfig = config.tags ?? {};
    this.extensionsConfig = config.extensions ?? {};
    this.standaloneTemplateConfig = config.template;
    this.tagImportRegexp = this.buildTagImportRegexp();

    this.typedScriptExtensions = this.extensionsOfType('typed-script');
    this.untypedScriptExtensions = this.extensionsOfType('untyped-script');
    this.templateExtensions = this.extensionsOfType('template');
  }

  public static load(
    specifier: string | Array<string> | Record<string, unknown>,
    { rootDir = '.' } = {}
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

  public isTemplate(path: string): boolean {
    return this.getSourceKind(path) === 'template';
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
   * Returns the import path that should be used for `@glint/template`-derived
   * types to drive typechecking for standalone template files, if this
   * environment supports such templates.
   */
  public getTypesForStandaloneTemplate(): string | undefined {
    return this.standaloneTemplateConfig?.typesModule;
  }

  /**
   * Given the path of a script, returns an array of candidate paths where
   * a template corresponding to that script might be located.
   */
  public getPossibleTemplatePaths(scriptPath: string): Array<PathCandidateWithDeferral> {
    return normalizePathCandidates(
      this.standaloneTemplateConfig?.getPossibleTemplatePaths(scriptPath) ?? []
    );
  }

  /**
   * Given the path of a template, returns an array of candidate paths where
   * a script corresponding to that script might be located.
   */
  public getPossibleScriptPaths(templatePath: string): Array<PathCandidateWithDeferral> {
    return normalizePathCandidates(
      this.standaloneTemplateConfig?.getPossibleScriptPaths(templatePath) ?? []
    );
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
      config?.preprocess || config?.transform || this.tagImportRegexp.test(moduleContents)
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

  private extensionsOfType(kind: SourceKind): Array<string> {
    return Object.keys(this.extensionsConfig).filter(
      (key) => this.extensionsConfig[key].kind === kind
    );
  }
}

function normalizeEnvironmentSpecifier(
  specifier: string | string[] | Record<string, unknown>
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
  rootDir: string
): GlintEnvironmentConfig {
  let tags: GlintTagsConfig = {};
  let extensions: GlintExtensionsConfig = { ...DEFAULT_EXTENSIONS };
  let template: GlintTemplateConfig | undefined;
  for (let [envName, envUserConfig] of Object.entries(envs)) {
    let envPath = locateEnvironment(envName, rootDir);
    let envModule = require(envPath);
    let envFunction = envModule?.default ?? envModule;
    if (typeof envFunction !== 'function') {
      throw new SilentError(
        `The specified environment '${envName}', which was loaded from ${envPath}, ` +
          `does not appear to be a Glint environment package.`
      );
    }

    let config = envFunction(envUserConfig ?? {}) as GlintEnvironmentConfig;

    if (config.template) {
      if (template) {
        throw new SilentError(
          'Multiple configured Glint environments attempted to define behavior for standalone template files.'
        );
      }

      template = config.template;
    }

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
                "'."
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
              ' file extension.'
          );
        }

        extensions[extension] = extensionConfig;
      }
    }
  }

  return { tags, extensions, template };
}

function locateEnvironment(name: string, basedir: string): string {
  // Resolve a package name, either shorthand or explicit
  for (let candidate of [`@glint/environment-${name}`, `glint-environment-${name}`, name]) {
    let pkg = tryResolve(`${candidate}/package.json`, basedir);
    if (pkg) {
      let relativePath = require(pkg)['glint-environment'] ?? '.';
      return path.resolve(path.dirname(pkg), relativePath);
    }
  }

  // Resolve a path to an explicit file
  let literalPath = tryResolve(name, basedir);
  if (literalPath) {
    return literalPath;
  }

  throw new SilentError(`Unable to resolve environment '${name}' from ${basedir}`);
}

function normalizePathCandidates(
  candidates: Array<PathCandidate>
): Array<PathCandidateWithDeferral> {
  return candidates.map((candidate) =>
    typeof candidate === 'string' ? { path: candidate, deferTo: [] } : candidate
  );
}

function tryResolve(name: string, basedir: string): string | null {
  try {
    return resolve.sync(name, { basedir });
  } catch (error: any) {
    if (error?.code === 'MODULE_NOT_FOUND') {
      return null;
    }

    throw error;
  }
}
