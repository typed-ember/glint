import * as path from 'node:path';
import { Minimatch, IMinimatch } from 'minimatch';
import { GlintEnvironment } from './environment';
import { GlintConfigInput } from './index.js';

/**
 * This class represents parsed Glint configuration from a `tsconfig` or `jsconfig` file,
 * with methods for interrogating project configuration based on its contents.
 */
export class GlintConfig {
  public declare readonly ts: typeof import('typescript');
  public readonly rootDir: string;
  public readonly configPath: string;
  public readonly environment: GlintEnvironment;
  public readonly checkStandaloneTemplates: boolean;

  private includeMatchers: Array<IMinimatch>;
  private excludeMatchers: Array<IMinimatch>;

  public constructor(
    ts: typeof import('typescript'),
    configPath: string,
    config: GlintConfigInput
  ) {
    Object.defineProperty(this, 'ts', { value: ts });
    this.configPath = normalizePath(configPath);
    this.rootDir = path.dirname(configPath);
    this.environment = GlintEnvironment.load(config.environment, { rootDir: this.rootDir });
    this.checkStandaloneTemplates = config.checkStandaloneTemplates ?? true;

    let extensions = this.environment.getConfiguredFileExtensions();
    let transform = config.transform ?? {};
    let include = Array.isArray(transform.include)
      ? transform.include
      : transform.include
      ? [transform.include]
      : extensions.map((ext) => `**/*${ext}`);

    let exclude = Array.isArray(transform.exclude)
      ? transform.exclude
      : [transform.exclude ?? '**/node_modules/**'];

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
