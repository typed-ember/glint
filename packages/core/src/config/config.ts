import { GlintConfigInput } from '@glint/ember-tsc/config-types';
import * as path from 'node:path';
import { GlintEnvironment } from './environment.js';

/**
 * This class represents parsed Glint configuration from a `tsconfig` or `jsconfig` file,
 * with methods for interrogating project configuration based on its contents.
 */
export class GlintConfig {
  declare public readonly ts: typeof import('typescript') | null;
  public readonly rootDir: string;
  public readonly configPath: string | undefined;
  public readonly environment: GlintEnvironment;

  public constructor(
    ts: typeof import('typescript') | null,
    configPath: string | undefined,
    config: GlintConfigInput,
    rootDir?: string,
  ) {
    Object.defineProperty(this, 'ts', { value: ts });
    this.configPath = configPath ? normalizePath(configPath) : undefined;
    this.rootDir = rootDir ?? (configPath ? path.dirname(configPath) : process.cwd());
    this.environment = GlintEnvironment.load(config);
  }
}

export function normalizePath(fileName: string): string {
  if (path.sep !== '/') {
    return fileName.split(path.sep).join('/');
  }

  return fileName;
}
