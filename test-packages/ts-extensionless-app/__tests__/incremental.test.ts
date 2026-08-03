import { afterEach, describe, expect, test } from 'vitest';
import { execa } from 'execa';
import { appendFileSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(__dirname, '..');
const FIXTURE = resolve(PROJECT_ROOT, 'incremental-fixture');
const EDITED_FILE = resolve(FIXTURE, 'has-decl-error.gts');
const BUILD_INFO = resolve(FIXTURE, 'tsconfig.incremental.tsbuildinfo');

const originalContents = readFileSync(EDITED_FILE, 'utf8');

// Regression for `--incremental` shape signatures of .gts files.
//
// The incremental builder computes a changed file's signature by
// declaration-emitting it and hashing the output — including the
// `(start,length)` of every declaration-emit diagnostic. Those positions are
// in transformed-file coordinates, which begin with a whitespace pad exactly
// as long as the raw .gts — so, unfixed, ANY length-changing edit to a .gts
// with a declaration-emit diagnostic (e.g. TS4094, which `--noEmit` never
// reports) produces a brand-new signature, and tsc re-checks the file's whole
// transitive importer closure on every edit, forever.
//
// The fix maps the diagnostics back to original source coordinates before
// they are hashed (`EmitOnly.BuilderSignature` emits), restoring parity with
// how tsc treats a .ts file: the signature is stable under edits after the
// diagnostic and changes for edits before it.
describe('ember-tsc --incremental: .gts shape signatures are stable across edits', () => {
  afterEach(() => {
    writeFileSync(EDITED_FILE, originalContents);
    rmSync(BUILD_INFO, { force: true });
  });

  async function check(): Promise<void> {
    const result = await execa('pnpm', ['ember-tsc', '--project', 'tsconfig.incremental.json'], {
      cwd: PROJECT_ROOT,
      reject: false,
      all: true,
    });
    expect(result.exitCode, result.all).toBe(0);
  }

  function storedSignature(): string {
    const buildInfo = JSON.parse(readFileSync(BUILD_INFO, 'utf8')) as {
      fileNames: string[];
      fileInfos: Array<string | { version: string; signature?: string }>;
    };
    const index = buildInfo.fileNames.findIndex((name) => name.endsWith('has-decl-error.gts'));
    expect(index).toBeGreaterThanOrEqual(0);
    const info = buildInfo.fileInfos[index];
    // A string entry means the signature is just the source-text hash (the
    // builder never computed a declaration-based signature for the file).
    return typeof info === 'string' ? info : (info.signature ?? info.version);
  }

  test('a length-changing edit does not change the declaration signature', async () => {
    rmSync(BUILD_INFO, { force: true });

    // Full build: every signature starts out as a source-text hash.
    await check();

    // First edit: the builder computes a real declaration-based signature.
    appendFileSync(EDITED_FILE, '\n// length-changing edit one\n');
    await check();
    const signatureAfterFirstEdit = storedSignature();

    // Second, differently-sized edit: the declaration output is unchanged, so
    // the signature must not change — otherwise every edit to this file
    // re-checks its entire transitive importer closure.
    appendFileSync(EDITED_FILE, '\n// a second, longer length-changing edit\n');
    await check();
    const signatureAfterSecondEdit = storedSignature();

    expect(signatureAfterSecondEdit).toBe(signatureAfterFirstEdit);
  });

  // The inverse case, to pin tsc parity: for a .ts file, an edit BEFORE a
  // declaration-emit diagnostic moves its source position and therefore
  // changes the signature. A .gts must behave the same — the diagnostics are
  // mapped to source coordinates, not discarded.
  test('an edit before the diagnostic changes the signature, as it does for .ts', async () => {
    rmSync(BUILD_INFO, { force: true });

    await check();

    appendFileSync(EDITED_FILE, '\n// trailing edit\n');
    await check();
    const signatureBefore = storedSignature();

    // Prepend: everything after it — including the diagnostic — shifts.
    writeFileSync(EDITED_FILE, `// leading comment\n${readFileSync(EDITED_FILE, 'utf8')}`);
    await check();
    const signatureAfter = storedSignature();

    expect(signatureAfter).not.toBe(signatureBefore);
  });
});
