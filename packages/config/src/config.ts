import path from 'path';
import { Minimatch, IMinimatch } from 'minimatch';
import { GlintEnvironment } from './environment';

export type GlintConfigInput = {
  environment: string | Array<string>;
  checkStandaloneTemplates?: boolean;
  include?: string | Array<string>;
  exclude?: string | Array<string>;
};

/**
 * This class represents a parsed `.glintrc` file, with methods for interrogating
 * project configuration based on the contents of the file.
 */
export class GlintConfig {
  public readonly rootDir: string;
  public readonly environment: GlintEnvironment;
  public readonly checkStandaloneTemplates: boolean;

  private includeMatchers: Array<IMinimatch>;
  private excludeMatchers: Array<IMinimatch>;

  public constructor(rootDir: string, config: Record<string, unknown> = {}) {
    validateConfigInput(config);

    this.rootDir = normalizePath(rootDir);
    this.environment = GlintEnvironment.load(config.environment, { rootDir });
    this.checkStandaloneTemplates = config.checkStandaloneTemplates ?? true;

    let extensions = this.environment.getConfiguredFileExtensions();
    let include = Array.isArray(config.include)
      ? config.include
      : config.include
      ? [config.include]
      : extensions.map((ext) => `**/*${ext}`);

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

  // Given the path of a template or script (potentially with a custom extension),
  // returns the corresponding .js or .ts path we present to the TS language service.
  public getSynthesizedScriptPathForTS(filename: string): string {
    let extension = path.extname(filename);
    let filenameWithoutExtension = filename.slice(0, filename.lastIndexOf(extension));
    switch (this.environment.getSourceKind(filename)) {
      case 'template':
        return `${filenameWithoutExtension}${this.checkStandaloneTemplates ? '.ts' : '.js'}`;
      case 'typed-script':
        return `${filenameWithoutExtension}.ts`;
      case 'untyped-script':
        return `${filenameWithoutExtension}.js`;
      default:
        return filename;
    }
  }

  private buildMatchers(globs: Array<string>): Array<IMinimatch> {
    return globs.map((glob) => new Minimatch(normalizePath(path.resolve(this.rootDir, glob))));
  }
}

export function normalizePath(fileName: string): string {
  if (path.sep !== '/') {
    return fileName.split(path.sep).join('/');
  }

  return fileName;
}

function validateConfigInput(input: Record<string, unknown>): asserts input is GlintConfigInput {
  assert(
    Array.isArray(input['environment'])
      ? input['environment'].every((env) => typeof env === 'string')
      : typeof input['environment'] === 'string',
    'Glint config must specify an `environment` that is a string or an array of strings'
  );

  assert(
    input['checkStandaloneTemplates'] === undefined ||
      typeof input['checkStandaloneTemplates'] === 'boolean',
    'If defined, `checkStandaloneTemplates` must be a boolean'
  );

  assert(
    Array.isArray(input['include'])
      ? input['include'].every((item) => typeof item === 'string')
      : !input['include'] || typeof input['include'] === 'string',
    'If defined, `include` must be a string or array of strings'
  );

  assert(
    Array.isArray(input['exclude'])
      ? input['exclude'].every((item) => typeof item === 'string')
      : !input['exclude'] || typeof input['exclude'] === 'string',
    'If defined, `exclude` must be a string or array of strings'
  );
}

function assert(test: unknown, message: string): asserts test {
  if (!test) {
    throw new Error(`@glint/config: ${message}`);
  }
}
