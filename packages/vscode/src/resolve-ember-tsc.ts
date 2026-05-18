import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';

export type EmberTscSource = 'auto' | 'workspace' | 'bundled';

export interface ResolveEmberTscInput {
  /** Absolute path of the workspace folder containing the active document. */
  workspaceRoot: string;
  /** Raw value of the `glint2.libraryPath` setting. Defaults to `'.'`. */
  libraryPath: string;
  /** Raw value of the `glint2.emberTscSource` setting. */
  emberTscSource: EmberTscSource;
  /**
   * Absolute path of the currently active glimmer-* document, if any. When set,
   * `auto` mode walks up from this file looking for the closest
   * `node_modules/@glint/ember-tsc/bin/glint-language-server`.
   */
  activeFileFsPath?: string;
  /** Absolute path to the bundled `glint-language-server.js`, if available. */
  bundledServerPath?: string;
}

export interface ResolveEmberTscResult {
  /** Resolved path to the language-server entry point, if one was found. */
  path?: string;
  /** Which source was ultimately selected. */
  source: EmberTscSource;
  /** The user-facing configured source (unchanged from input). */
  configuredSource: EmberTscSource;
  /** True if we wanted workspace but had to fall back to bundled. */
  usedFallback: boolean;
  /** Directory used as the starting point for the workspace lookup. */
  resolutionDir: string;
  /**
   * True when `auto` mode discovered the package by walking up from
   * `activeFileFsPath` rather than from the configured library path.
   */
  autoDiscovered: boolean;
}

const EMBER_TSC_BIN = '@glint/ember-tsc/bin/glint-language-server';
const EMBER_TSC_REL = path.join(
  'node_modules',
  '@glint',
  'ember-tsc',
  'bin',
  'glint-language-server',
);

/**
 * Resolve which `glint-language-server` binary should be launched for the
 * current workspace + active file.
 *
 * Resolution order:
 *  1. If `emberTscSource === 'bundled'`, always use the bundled server.
 *  2. Try the configured library path (`workspaceRoot + libraryPath`).
 *  3. In `auto` mode, walk up from the active document's directory toward
 *     `workspaceRoot` looking for the nearest `@glint/ember-tsc` install.
 *  4. Fall back to the bundled server.
 */
export function resolveEmberTscServerPath(input: ResolveEmberTscInput): ResolveEmberTscResult {
  const { workspaceRoot, libraryPath, emberTscSource, activeFileFsPath, bundledServerPath } = input;

  const resolutionDir = path.resolve(workspaceRoot, libraryPath);

  if (emberTscSource === 'bundled') {
    return {
      path: bundledServerPath,
      source: 'bundled',
      configuredSource: 'bundled',
      usedFallback: false,
      resolutionDir,
      autoDiscovered: false,
    };
  }

  const workspacePath = resolveWorkspaceEmberTscServerPath(resolutionDir);
  if (workspacePath) {
    return {
      path: workspacePath,
      source: 'workspace',
      configuredSource: emberTscSource,
      usedFallback: false,
      resolutionDir,
      autoDiscovered: false,
    };
  }

  if (emberTscSource === 'auto' && activeFileFsPath) {
    const discovered = findEmberTscByWalkingUp(activeFileFsPath, workspaceRoot);
    if (discovered) {
      return {
        path: discovered.serverPath,
        source: 'workspace',
        configuredSource: emberTscSource,
        usedFallback: false,
        resolutionDir: discovered.resolutionDir,
        autoDiscovered: true,
      };
    }
  }

  return {
    path: bundledServerPath,
    source: 'bundled',
    configuredSource: emberTscSource,
    usedFallback: true,
    resolutionDir,
    autoDiscovered: false,
  };
}

/**
 * Try to resolve `@glint/ember-tsc/bin/glint-language-server` using Node's
 * standard `require.resolve` algorithm rooted at `resolutionDir`.
 */
export function resolveWorkspaceEmberTscServerPath(resolutionDir: string): string | undefined {
  try {
    const customRequire = createRequire(path.join(resolutionDir, 'package.json'));
    return customRequire.resolve(EMBER_TSC_BIN);
  } catch {
    return undefined;
  }
}

/**
 * Walk upwards from the directory containing `startFsPath`, stopping at
 * `stopDir` (inclusive), looking for the nearest
 * `node_modules/@glint/ember-tsc/bin/glint-language-server`.
 *
 * Returns `undefined` if no install is found. Both `node` and `node.js`
 * variants are accepted (the published package ships an extensionless bin).
 */
export function findEmberTscByWalkingUp(
  startFsPath: string,
  stopDir: string,
): { serverPath: string; resolutionDir: string } | undefined {
  const normalizedStop = path.resolve(stopDir);

  let current = path.resolve(startFsPath);
  // If we were handed a file path, start from its directory.
  try {
    if (fs.statSync(current).isFile()) {
      current = path.dirname(current);
    }
  } catch {
    current = path.dirname(current);
  }

  // Bail out if startFsPath is not under stopDir.
  const rel = path.relative(normalizedStop, current);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return undefined;
  }

  for (;;) {
    const candidate = path.join(current, EMBER_TSC_REL);
    if (fs.existsSync(candidate) || fs.existsSync(`${candidate}.js`)) {
      // Prefer the extensionless bin (matches what require.resolve returns),
      // but accept the .js variant for robustness.
      const finalPath = fs.existsSync(candidate) ? candidate : `${candidate}.js`;
      return { serverPath: finalPath, resolutionDir: current };
    }

    if (current === normalizedStop) {
      return undefined;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}
