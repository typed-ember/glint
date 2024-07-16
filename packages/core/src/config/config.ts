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
  public readonly enableTsPlugin: boolean;

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
    this.enableTsPlugin = config.enableTsPlugin ?? false;
  }
}

export function normalizePath(fileName: string): string {
  if (path.sep !== '/') {
    return fileName.split(path.sep).join('/');
  }

  return fileName;
}
