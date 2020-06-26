import path from 'path';
import { cosmiconfigSync } from 'cosmiconfig';
import { Minimatch, IMinimatch } from 'minimatch';

/**
 * Loads glint configuration, starting from the given directory
 * and searching upwards.
 */
export function loadConfig(from: string): GlintConfig {
  let result = cosmiconfigSync('glint').search(from);
  if (result) {
    return new GlintConfig(path.dirname(result.filepath), result.config);
  }

  return new GlintConfig(from);
}

export class GlintConfig {
  private includeMatchers: Array<IMinimatch>;
  private excludeMatchers: Array<IMinimatch>;

  public constructor(public readonly rootDir: string, config: Record<string, unknown> = {}) {
    validateInput(config);

    let include = Array.isArray(config.include) ? config.include : [config.include ?? '**/*.ts'];
    let exclude = Array.isArray(config.exclude)
      ? config.exclude
      : [config.exclude ?? '**/node_modules/**'];

    this.includeMatchers = include.map((glob) => new Minimatch(path.resolve(rootDir, glob)));
    this.excludeMatchers = exclude.map((glob) => new Minimatch(path.resolve(rootDir, glob)));
  }

  public includesFile(fileName: string): boolean {
    return (
      this.excludeMatchers.every((matcher) => !matcher.match(fileName)) &&
      this.includeMatchers.some((matcher) => matcher.match(fileName))
    );
  }
}

export type GlintConfigInput = {
  include?: string | Array<string>;
  exclude?: string | Array<string>;
};

function validateInput(input: Record<string, unknown>): asserts input is GlintConfigInput {
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
