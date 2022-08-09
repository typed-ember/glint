import type TS from 'typescript';
import TransformManager from '../../common/transform-manager';
import TransformManagerPool from './transform-manager-pool';

export function sysForCompilerHost(
  ts: typeof TS,
  transformManagerOrPool: TransformManager | TransformManagerPool
): TS.System {
  return {
    ...ts.sys,
    readDirectory: transformManagerOrPool.readDirectory,
    watchDirectory: transformManagerOrPool.watchDirectory,
    fileExists: transformManagerOrPool.fileExists,
    watchFile: transformManagerOrPool.watchTransformedFile,
    readFile: transformManagerOrPool.readTransformedFile,
  };
}
