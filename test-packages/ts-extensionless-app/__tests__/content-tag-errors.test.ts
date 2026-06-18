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

    const output = stripAnsi(result.all ?? '');

    expect(result.exitCode, `output:\n${output}`).not.toBe(0);
    expect(output).toContain('_broken_template.gts');
    // content-tag's lexing failure for `</template` (missing `>`) ends up as
    // an "Unexpected token" parse error.
    expect(output).toMatch(/Unexpected token|Expected content tag/);
  });
});
