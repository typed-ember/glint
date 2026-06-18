import { afterEach, describe, expect, test } from 'vitest';
import { execa } from 'execa';
import stripAnsi from 'strip-ansi';
import { unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(__dirname, '..');
const SRC_DIR = resolve(PROJECT_ROOT, 'src');
// Invoke the binary directly with `node` rather than going through `pnpm
// ember-tsc`. The `pnpm` wrapper can prepend deprecation warnings or other
// noise to stdout, which previously forced us to keep only lines mentioning
// the target file — that positive-include filter risked hiding real
// diagnostic output (additional errors, the trailing `Found N error...`
// summary, etc.). Running the bin directly gives us the unfiltered output
// `ember-tsc` itself produces, so the snapshot is exhaustive.
const EMBER_TSC_BIN = resolve(
  PROJECT_ROOT,
  '..',
  '..',
  'packages',
  'ember-tsc',
  'bin',
  'ember-tsc.js',
);

// Regression test for https://github.com/typed-ember/glint/issues/1148.
// `ember-tsc` (volar's `runTsc`) used to silently drop content-tag parse
// errors — a broken `<template>` tag would not be reported at all.
describe('ember-tsc surfaces content-tag parse errors', () => {
  const targets: string[] = [];

  afterEach(() => {
    while (targets.length) {
      try {
        unlinkSync(targets.pop()!);
      } catch {
        // ignore
      }
    }
  });

  test('reports an unclosed <template> tag and exits non-zero', async () => {
    const target = resolve(SRC_DIR, '_broken_template.gts');
    targets.push(target);
    writeFileSync(
      target,
      [
        `import Component from '@glimmer/component';`,
        ``,
        `export default class Broken extends Component {`,
        `  <template>`,
        `    <div></div>`,
        `  </template`,
        `}`,
        ``,
      ].join('\n'),
    );

    const result = await execa('node', [EMBER_TSC_BIN, '--noEmit'], {
      cwd: PROJECT_ROOT,
      reject: false,
      all: true,
    });

    const diagnostic = stripAnsi(result.all ?? '').trimEnd();

    expect(result.exitCode, `output:\n${result.all}`).not.toBe(0);
    // Snapshot the formatted diagnostic line. This guards against the
    // previous bug where content-tag's `help` text (with its own line
    // numbers) was concatenated into the message, producing output with
    // two conflicting line numbers — e.g.:
    //   src/_broken_template.gts(6,11): error TS0: Unexpected token ...
    //
    //    7 │ }
    //      ╰────
    // The diagnostic should report a single line/column, matching the
    // location TypeScript itself emits in the header.
    expect(diagnostic).toMatchInlineSnapshot(
      `"src/_broken_template.gts(6,11): error TS0: Unexpected token \`<lexing error>\`. Expected content tag"`,
    );
  });

  test('--pretty output renders the offending source line under the header', async () => {
    const target = resolve(SRC_DIR, '_broken_template_pretty.gts');
    targets.push(target);
    writeFileSync(
      target,
      [
        `import Component from '@glimmer/component';`,
        ``,
        `export default class Broken extends Component {`,
        `  <template>`,
        `    <div></div>`,
        `  </template`,
        `}`,
        ``,
      ].join('\n'),
    );

    const result = await execa('node', [EMBER_TSC_BIN, '--noEmit', '--pretty'], {
      cwd: PROJECT_ROOT,
      reject: false,
      all: true,
    });

    expect(result.exitCode, `output:\n${result.all}`).not.toBe(0);

    // Snapshot the full (ansi-stripped) output. Because we invoke the bin
    // directly there is no wrapper noise to filter around.
    const block = stripAnsi(result.all ?? '').trimEnd();

    // Regression guard: previously this block printed an empty source line
    // (because the diagnostic was attached to the SourceFile holding
    // volar's whitespace-blanked transformed text), e.g.:
    //   src/Broken.gts:6:11 - error TS0: Unexpected token ...
    //
    //   6
    //
    //   Found 1 error in src/Broken.gts:6
    // The fix attaches the diagnostic to a synthetic SourceFile built from
    // the *original* .gts text, so TS prints the actual offending line
    // ("  </template") and a caret pointing at the bad column.
    expect(block).toMatchInlineSnapshot(`
      "src/_broken_template_pretty.gts:6:11 - error TS0: Unexpected token \`<lexing error>\`. Expected content tag

      6   </template
                  ~


      Found 1 error in src/_broken_template_pretty.gts:6"
    `);
  });
});
