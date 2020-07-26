import path from 'path';
import { Minimatch, IMinimatch } from 'minimatch';

export type GlintConfigInput = {
  include?: string | Array<string>;
  exclude?: string | Array<string>;
};

/**
 * This class represents a parsed `.glintrc` file, with methods for interrogating
 * project configuration based on the contents of the file.
 */
export class GlintConfig {
  public readonly rootDir: string;

  private includeMatchers: Array<IMinimatch>;
  private excludeMatchers: Array<IMinimatch>;

  public constructor(rootDir: string, config: Record<string, unknown> = {}) {
    validateConfigInput(config);

    this.rootDir = normalizePath(rootDir);

    let include = Array.isArray(config.include) ? config.include : [config.include ?? '**/*.ts'];
    let exclude = Array.isArray(config.exclude)
      ? config.exclude
      : [config.exclude ?? '**/node_modules/**'];

    this.includeMatchers = this.buildMatchers(include);
    this.excludeMatchers = this.buildMatchers(exclude);
  }

  /**
   * Indicates whether this configuration object applies to the file at the
   * given path.
   */
  public includesFile(rawFileName: string): boolean {
    let fileName = normalizePath(rawFileName);

    return (
      this.excludeMatchers.every((matcher) => !matcher.match(fileName)) &&
      this.includeMatchers.some((matcher) => matcher.match(fileName))
    );
  }

  private buildMatchers(globs: Array<string>): Array<IMinimatch> {
    return globs.map((glob) => new Minimatch(normalizePath(path.resolve(this.rootDir, glob))));
  }

}

function validateConfigInput(input: Record<string, unknown>): asserts input is GlintConfigInput {
  assert(
    typeof input.environment === 'string',
    'Glint config must specify an `environment` string'
  );

  assert(
    Array.isArray(input.include)
      ? input.include.every((item) => typeof item === 'string')
      : !input.include || typeof input.include === 'string',
    'If defined, `include` must be a string or array of strings'
  );

  assert(
    Array.isArray(input.exclude)
      ? input.exclude.every((item) => typeof item === 'string')
      : !input.exclude || typeof input.exclude === 'string',
    'If defined, `exclude` must be a string or array of strings'
  );
}

function assert(test: unknown, message: string): asserts test {
  if (!test) {
    throw new Error(`@glint/config: ${message}`);
  }
}

function normalizePath(fileName: string): string {
  if (path.sep !== '/') {
    return fileName.split(path.sep).join('/');
  }

  return fileName;
}
