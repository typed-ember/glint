import resolve from 'resolve';
import escapeStringRegexp from 'escape-string-regexp';

export type GlintEnvironmentConfig = {
  tags: GlintTagsConfig;
};

export type GlintTagsConfig = {
  readonly [importSource: string]: {
    readonly [importSpecifier: string]: {
      readonly typesSource: string;
    };
  };
};

export class GlintEnvironment {
  private tags: GlintTagsConfig;
  private tagImportRegexp: RegExp;

  public constructor(config: GlintEnvironmentConfig) {
    this.tags = config.tags;
    this.tagImportRegexp = this.buildTagImportRegexp();
  }

  public static load(name: string, { rootDir = '.' } = {}): GlintEnvironment {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    let envModule = require(locateEnvironment(name, rootDir));
    let envFunction = envModule.default ?? envModule;
    return new GlintEnvironment(envFunction());
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
    return this.tags;
  }

  private buildTagImportRegexp(): RegExp {
    let importSources = Object.keys(this.tags);
    let regexpSource = importSources.map(escapeStringRegexp).join('|');
    return new RegExp(regexpSource);
  }
}

function locateEnvironment(name: string, basedir: string): string {
  for (let candidate of [`@glint/environment-${name}`, name]) {
    try {
      return resolve.sync(candidate, { basedir });
    } catch (error) {
      if (error?.code === 'MODULE_NOT_FOUND') {
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Unable to resolve environment '${name}' from ${basedir}`);
}
