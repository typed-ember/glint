import { describe, expect, test } from 'vitest';
import { execa } from 'execa';
import stripAnsi from 'strip-ansi';
import { resolve } from 'node:path';
import { readFileSync, rmSync } from 'node:fs';

const PROJECT_ROOT = resolve(__dirname, '..');

// Regression for build mode (`ember-tsc --build` / `tsc -b`) over a composite
// project that emits declarations for `.gts`.
//
// `.gts` is registered as a supported TS extension (so `hasTSFileExtension` is
// true), but TypeScript's JS-output-extension computation (`tryGetJSExtensionForFile`)
// didn't know about it. When declaration emit synthesizes a module specifier to
// a `.gts` file with a "js" ending preference, it calls `getJSExtensionForFile`,
// which hit `Debug.fail("Extension .gts is unsupported")` and aborted the build.
//
// The `build-mode-fixture/` project is shaped to deterministically trigger that:
//   - `outer.gts` keeps a `./util.js` (.js-extension) import in its emitted .d.ts
//     → forces the module-specifier ending preference to JsExtension, and
//   - its return type `Helper` comes transitively from `helper.gts` (not directly
//     imported) → declaration emit must *synthesize* a specifier to `./helper.gts`.
describe('ember-tsc --build: declaration emit for .gts in a composite project', () => {
  test('computes .gts module specifiers without crashing', async () => {
    // Force a fresh build so declaration emit (and specifier computation) runs.
    rmSync(resolve(PROJECT_ROOT, 'build-mode-declarations'), { recursive: true, force: true });
    rmSync(resolve(PROJECT_ROOT, 'tsconfig.build-mode.tsbuildinfo'), { force: true });

    const result = await execa('pnpm', ['ember-tsc', '--build', 'tsconfig.build-mode.json'], {
      cwd: PROJECT_ROOT,
      reject: false,
      all: true,
    });
    const output = stripAnsi(result.all ?? '');

    expect(output, output).not.toMatch(/Extension \.gts is unsupported/);
    expect(output, output).not.toMatch(/Debug Failure/);
    expect(result.exitCode, output).toBe(0);

    // And the emitted declaration must reference the .gts target with a `.js`
    // ending (the same mapping tsc uses for `.ts` -> `.js`), not crash or drop it.
    const outerDts = readFileSync(
      resolve(PROJECT_ROOT, 'build-mode-declarations/outer.d.ts'),
      'utf8',
    );
    expect(outerDts).toMatch(/import\(["']\.\/helper\.js["']\)\.Helper/);
  });
});
