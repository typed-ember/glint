import TransformManager from '../../common/transform-manager';
import type TS from 'typescript';

export function sysForWatchCompilerHost(
  ts: typeof TS,
  transformManager: TransformManager
): typeof ts.sys {
  return {
    ...ts.sys,
    readDirectory: transformManager.readDirectory,
    watchDirectory: transformManager.watchDirectory,
    fileExists: transformManager.fileExists,
    watchFile: transformManager.watchTransformedFile,
    readFile: transformManager.readTransformedFile,
  };
}
