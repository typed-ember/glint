import { afterEach, describe, expect, test } from 'vitest';
import { execa } from 'execa';
import stripAnsi from 'strip-ansi';
import { unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(__dirname, '..');
const SRC_DIR = resolve(PROJECT_ROOT, 'src');

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

    const result = await execa('pnpm', ['ember-tsc', '--noEmit'], {
      cwd: PROJECT_ROOT,
      reject: false,
      all: true,
    });

    // Drop the pnpm/node deprecation noise so the snapshot covers only the
    // diagnostic output we actually care about.
    const diagnostic = stripAnsi(result.all ?? '')
      .split('\n')
      .filter((line) => line.includes('_broken_template.gts'))
      .join('\n');

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

    const result = await execa('pnpm', ['ember-tsc', '--noEmit', '--pretty'], {
      cwd: PROJECT_ROOT,
      reject: false,
      all: true,
    });

    expect(result.exitCode, `output:\n${result.all}`).not.toBe(0);

    // Strip ANSI and pnpm/node noise; keep only lines from the
    // diagnostic block (header, blank, source-snippet, blank, footer).
    const lines = stripAnsi(result.all ?? '').split('\n');
    const headerIdx = lines.findIndex((l) => l.includes('_broken_template_pretty.gts:'));
    expect(headerIdx, `output:\n${result.all}`).toBeGreaterThanOrEqual(0);
    // Take the header through the "Found N error..." footer.
    const footerIdx = lines.findIndex((l, i) => i > headerIdx && /^Found \d+ error/.test(l));
    const block = lines.slice(headerIdx, footerIdx >= 0 ? footerIdx + 1 : headerIdx + 7).join('\n');

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
