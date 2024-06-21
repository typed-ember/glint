import * as path from 'node:path';
import { GlintEnvironment } from './environment.js';
import { GlintConfigInput } from '@glint/core/config-types';

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

  private extensions: Array<string>;

  public constructor(
    ts: typeof import('typescript'),
    configPath: string,
    config: GlintConfigInput,
  ) {
    Object.defineProperty(this, 'ts', { value: ts });
    this.configPath = normalizePath(configPath);
    this.rootDir = path.dirname(configPath);
    this.environment = GlintEnvironment.load(config.environment, { rootDir: this.rootDir });
    this.checkStandaloneTemplates = config.checkStandaloneTemplates ?? true;
    this.extensions = this.environment.getConfiguredFileExtensions();
  }

  /**
   * Indicates whether this configuration object applies to the file at the
   * given path.
   */
  public includesFile(rawFileName: string): boolean {
    return this.extensions.some((ext) => rawFileName.endsWith(ext));
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
}

export function normalizePath(fileName: string): string {
  if (path.sep !== '/') {
    return fileName.split(path.sep).join('/');
  }

  return fileName;
}
