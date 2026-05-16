import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { execa, type ResultPromise } from 'execa';
import stripAnsi from 'strip-ansi';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(__dirname, '..');
const SRC_DIR = resolve(PROJECT_ROOT, 'src');

const WATCH_SUMMARY = /Found (\d+) errors?\. Watching for file changes\./;

function pickAnyTsFile(): string {
  const candidate = readdirSync(SRC_DIR).find((name) => name.endsWith('.ts'));
  if (!candidate) throw new Error(`no .ts file found in ${SRC_DIR}`);
  return resolve(SRC_DIR, candidate);
}

describe('ember-tsc --watch', () => {
  let proc: ResultPromise<{ reject: false; all: true }> | undefined;
  let output = '';
  let cursor = 0;
  let pending: Array<{ pattern: RegExp; resolve: (m: RegExpMatchArray) => void }> = [];

  function waitForNext(pattern: RegExp): Promise<RegExpMatchArray> {
    const match = output.slice(cursor).match(pattern);
    if (match && match.index !== undefined) {
      cursor += match.index + match[0].length;
      return Promise.resolve(match);
    }
    return new Promise((resolvePromise) => {
      pending.push({ pattern, resolve: resolvePromise });
    });
  }

  function drainPending(): void {
    pending = pending.filter(({ pattern, resolve }) => {
      const match = output.slice(cursor).match(pattern);
      if (match && match.index !== undefined) {
        cursor += match.index + match[0].length;
        resolve(match);
        return false;
      }
      return true;
    });
  }

  beforeEach(() => {
    output = '';
    cursor = 0;
    pending = [];

    proc = execa('pnpm', ['ember-tsc', '--watch'], {
      cwd: PROJECT_ROOT,
      reject: false,
      all: true,
    });

    proc.all?.on('data', (chunk: Buffer) => {
      output += stripAnsi(chunk.toString());
      drainPending();
    });
  });

  afterEach(async () => {
    if (proc?.pid) {
      proc.kill('SIGTERM');
      await proc.catch(() => {});
    }
  });

  test('starts clean and catches an introduced error', async () => {
    const initial = await waitForNext(WATCH_SUMMARY);
    expect(initial[1], `initial output:\n${output}`).toBe('0');

    const target = pickAnyTsFile();
    const original = readFileSync(target, 'utf8');
    try {
      writeFileSync(target, `${original}\nconst __broken: string = 1;\n`);

      const errored = await waitForNext(WATCH_SUMMARY);
      expect(Number(errored[1]), `output after edit:\n${output}`).toBeGreaterThan(0);
    } finally {
      writeFileSync(target, original);
    }
  });
});
