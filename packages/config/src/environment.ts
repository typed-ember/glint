import resolve from 'resolve';
import path from 'path';
import escapeStringRegexp from 'escape-string-regexp';

export type GlintEnvironmentConfig = {
  tags?: GlintTagsConfig;
  template?: GlintTemplateConfig;
};

export type GlintTagConfig = {
  typesSource: string;
  capturesOuterScope: boolean;
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
  typesPath: string;
  getPossibleTemplatePaths(scriptPath: string): Array<PathCandidate>;
  getPossibleScriptPaths(templatePath: string): Array<PathCandidate>;
};

export class GlintEnvironment {
  private tagConfig: GlintTagsConfig;
  private standaloneTemplateConfig: GlintTemplateConfig | undefined;
  private tagImportRegexp: RegExp;

  public constructor(public readonly names: Array<string>, config: GlintEnvironmentConfig) {
    this.tagConfig = config.tags ?? {};
    this.standaloneTemplateConfig = config.template;
    this.tagImportRegexp = this.buildTagImportRegexp();
  }

  public static load(name: string | Array<string>, { rootDir = '.' } = {}): GlintEnvironment {
    let names = Array.isArray(name) ? name : [name];
    let config = loadMergedEnvironmentConfig(names, rootDir);
    return new GlintEnvironment(names, config);
  }

  /**
   * Returns the import path that should be used for `@glint/template`-derived
   * types to drive typechecking for standalone template files, if this
   * environment supports such templates.
   */
  public getTypesForStandaloneTemplate(): string | undefined {
    return this.standaloneTemplateConfig?.typesPath;
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
   * Indicates whether the given module _may_ import one of the template tags this
   * configuration is set up to cover. Note that this method is intended to be a
   * cheaper initial pass to avoid needlessly parsing modules that definitely don't
   * require rewriting. It therefore may produce false positives, but should never
   * give a false negative.
   */
  public moduleMayHaveTagImports(moduleContents: string): boolean {
    return this.tagImportRegexp.test(moduleContents);
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

function loadMergedEnvironmentConfig(
  envNames: Array<string>,
  rootDir: string
): GlintEnvironmentConfig {
  let tags: GlintTagsConfig = {};
  let template: GlintTemplateConfig | undefined;
  for (let name of envNames) {
    let envModule = require(locateEnvironment(name, rootDir));
    let envFunction = envModule.default ?? envModule;
    let config = envFunction() as GlintEnvironmentConfig;

    if (config.template) {
      if (template) {
        throw new Error(
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
            throw new Error(
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
  }

  return { tags, template };
}

function locateEnvironment(name: string, basedir: string): string {
  // Resolve a package name, either shorthand or explicit
  for (let candidate of [`@glint/environment-${name}`, name]) {
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

  throw new Error(`Unable to resolve environment '${name}' from ${basedir}`);
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
