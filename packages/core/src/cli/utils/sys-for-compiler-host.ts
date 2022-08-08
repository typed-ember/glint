import type TS from 'typescript';
import TransformManager from '../../common/transform-manager';
import TransformManagerPool from './transform-manager-pool';

export function sysForCompilerHost(
  ts: typeof TS,
  transformManagerOrSysPool: TransformManager | TransformManagerPool
): TS.System {
  return {
    ...ts.sys,
    readDirectory: transformManagerOrSysPool.readDirectory,
    watchDirectory: transformManagerOrSysPool.watchDirectory,
    fileExists: transformManagerOrSysPool.fileExists,
    watchFile: transformManagerOrSysPool.watchTransformedFile,
    readFile: transformManagerOrSysPool.readTransformedFile,
  };
}
