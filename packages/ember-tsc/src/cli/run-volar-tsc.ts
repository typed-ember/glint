import { runTsc } from '@volar/typescript/lib/quickstart/runTsc.js';
import { createEmberLanguagePlugin } from '../volar/ember-language-plugin.js';
import { findConfig } from '../config/index.js';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Loaded via CJS require so we can monkey-patch readFileSync; the ESM namespace
// object would be frozen.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('node:fs') as typeof import('node:fs');

export function run(): void {
  patchVolarProxyForExtensionlessImports();

  let cwd = process.cwd();

  const options = {
    extraSupportedExtensions: ['.gjs', '.gts'],

    // With the below configuration `{basename.gts}` will produce `{basename}.d.ts`
    // This is in line with how V2 addons build their components.
    // At build time, `.gts` components are emitted as `.js` files, so that's why the corresponding declarations should be `.d.ts`
    //
    // Please refer to https://github.com/typed-ember/glint/issues/988 for more information
    //
    // Before this option, glint emitted broken declarations in which relative imports to other .gts files did not strip extensions (https://github.com/typed-ember/glint/issues/628).
    // The declarations outputted by volar's runTsc luckily also remove extension in imports.
    extraExtensionsToRemove: ['.gjs', '.gts'],
  };

  const main = (): void =>
    runTsc(require.resolve('typescript/lib/tsc'), options, (ts, options) => {
      const glintConfig = findConfig(cwd);

      if (glintConfig) {
        const gtsLanguagePlugin = createEmberLanguagePlugin(glintConfig);
        return [gtsLanguagePlugin];
      } else {
        return [];
      }
    });
  main();
}

// Volar's proxyCreateProgram fast-paths module resolution back to the
// original compiler host when no import literal ends in a `.gts`/`.gjs`
// extension. In one-shot `tsc` the original host has no resolver, so volar's
// wrapper (which makes `Bang.gts` look like `Bang.d.ts` to tsc's extensionless
// resolver via `resolveHiddenExtensions`) runs and extensionless imports work.
// But `tsc --watch` installs a cached resolver on the host before volar's
// proxy runs, so extensionless `.gts` imports skip the wrapper and fail with
// TS2307. Patch the compiled volar source so the fast-path is also disabled
// whenever any plugin sets `resolveHiddenExtensions: true`.
//
// Upstream fix: https://github.com/volarjs/volar.js/pull/309 — once that ships
// in a `@volar/typescript` release we depend on, this monkey-patch can go.
// Tracking: https://github.com/typed-ember/glint/issues/806
function patchVolarProxyForExtensionlessImports(): void {
  const originalReadFileSync = fs.readFileSync;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fs as any).readFileSync = function (...args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (originalReadFileSync as any).apply(fs, args);
    const filePath = args[0];
    if (typeof filePath === 'string' && filePath.endsWith('/proxyCreateProgram.js')) {
      const text = typeof result === 'string' ? result : (result as Buffer).toString('utf8');
      const patched = applyProxyPatches(text);
      return typeof result === 'string' ? patched : Buffer.from(patched);
    }
    return result;
  };
}

function applyProxyPatches(source: string): string {
  const guard = '!languagePlugins.some(p => p.typescript?.resolveHiddenExtensions) && ';

  const literalsPattern =
    /(if \(resolveModuleNameLiterals\s+&& )(moduleLiterals\.every\(name => !pluginExtensions\.some\(ext => name\.text\.endsWith\(ext\)\)\)\) \{)/;
  const namesPattern =
    /(if \(resolveModuleNames && )(moduleNames\.every\(name => !pluginExtensions\.some\(ext => name\.endsWith\(ext\)\)\)\) \{)/;

  if (!literalsPattern.test(source) || !namesPattern.test(source)) {
    throw new Error(
      '[glint] failed to patch @volar/typescript proxyCreateProgram.js: ' +
        'fast-path conditions not found in expected shape. ' +
        'The volar dep may have changed; update applyProxyPatches() in run-volar-tsc.ts.',
    );
  }

  return source.replace(literalsPattern, `$1${guard}$2`).replace(namesPattern, `$1${guard}$2`);
}
