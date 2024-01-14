import { dirname } from 'node:path';
import * as TS from 'typescript';
import { ConfigLoader, GlintConfig } from '../../config/index.js';
import TransformManager from '../../common/transform-manager.js';
import { assert } from './assert.js';

/**
 * NOTE: this class ONLY used for CLI commands like in `perform-build-watch` and `perform-build`.
 * 
 * A lazy cache/lookup map for the parts of `TS.System` which `TransformManager`
 * cares about, such that any given file will be resolved against its closest
 * `GlintConfig`. This provides us three things:
 *
 * - The ability to apply the *correct* transforms to any given file, based on
 *   its closest Glint config.
 * - Lazy instantation for each manager: we only get a `TransformManager` when
 *   we actually *require* it for transforming some file
 * - A cache for the managers: we only instantiate them *once* for a given
 *   config.
 */
export default class TransformManagerPool {
  #rootTS: typeof TS;
  #rootSys: TS.System;
  #managers = new Map<GlintConfig, TransformManager>();
  #loader = new ConfigLoader();

  get isPool(): true {
    return true;
  }

  constructor(ts: typeof TS) {
    this.#rootTS = ts;
    this.#rootSys = ts.sys;
  }

  public managerForFile(path: string): TransformManager | null {
    return this.managerForDirectory(dirname(path));
  }

  public managerForDirectory(path: string): TransformManager | null {
    let config = this.#loader.configForDirectory(path);
    if (!config) return null;

    const existing = this.#managers.get(config);
    if (existing) return existing;

    const manager = new TransformManager(config);
    this.#managers.set(config, manager);
    return manager;
  }

  public resolveModuleNameLiterals = (
    moduleLiterals: readonly TS.StringLiteralLike[],
    containingFile: string,
    redirectedReference: TS.ResolvedProjectReference | undefined,
    options: TS.CompilerOptions
  ): readonly TS.ResolvedModuleWithFailedLookupLocations[] => {
    let resolveModuleNameLiterals = this.managerForFile(containingFile)?.resolveModuleNameLiterals;
    if (resolveModuleNameLiterals) {
      return resolveModuleNameLiterals(
        moduleLiterals,
        containingFile,
        redirectedReference,
        options
      );
    } else {
      return moduleLiterals.map((literal) =>
        this.#rootTS.resolveModuleName(
          literal.text,
          containingFile,
          options,
          this.#rootSys,
          undefined,
          redirectedReference
        )
      );
    }
  };

  public readDirectory = (
    rootDir: string,
    extensions: ReadonlyArray<string>,
    excludes: ReadonlyArray<string> | undefined,
    includes: ReadonlyArray<string>,
    depth?: number | undefined
  ): Array<string> => {
    let readDirectory =
      this.managerForDirectory(rootDir)?.readDirectory ?? this.#rootSys.readDirectory;
    return readDirectory(rootDir, extensions, excludes, includes, depth);
  };

  public watchDirectory = (
    path: string,
    originalCallback: TS.DirectoryWatcherCallback,
    recursive?: boolean,
    options?: TS.WatchOptions
  ): TS.FileWatcher => {
    assert(this.#rootSys.watchDirectory);
    let watchDirectory =
      this.managerForDirectory(path)?.watchDirectory ?? this.#rootSys.watchDirectory;
    return watchDirectory(path, originalCallback, recursive, options);
  };

  public fileExists = (filename: string): boolean => {
    let fileExists = this.managerForFile(filename)?.fileExists ?? this.#rootSys.fileExists;
    return fileExists(filename);
  };

  public watchTransformedFile = (
    path: string,
    originalCallback: TS.FileWatcherCallback,
    pollingInterval?: number,
    options?: TS.WatchOptions
  ): TS.FileWatcher => {
    assert(this.#rootSys.watchFile);
    let watchTransformedFile =
      this.managerForFile(path)?.watchTransformedFile ?? this.#rootSys.watchFile;
    return watchTransformedFile(path, originalCallback, pollingInterval, options);
  };

  public readTransformedFile = (filename: string, encoding?: string): string | undefined => {
    let readTransformedFile =
      this.managerForFile(filename)?.readTransformedFile ?? this.#rootSys.readFile;
    return readTransformedFile(filename, encoding);
  };

  public getModifiedTime = (filename: string): Date | undefined => {
    assert(this.#rootSys.getModifiedTime);
    let getModifiedTime =
      this.managerForFile(filename)?.getModifiedTime ?? this.#rootSys.getModifiedTime;
    return getModifiedTime(filename);
  };
}
