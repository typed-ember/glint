import { afterEach, describe, expect, test } from 'vitest';
import { execa, type ResultPromise } from 'execa';
import stripAnsi from 'strip-ansi';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(__dirname, '..');

// A generated (gitignored) member of the consumer project. Tests edit this file
// rather than a checked-in fixture, so a hard kill mid-run can't leave the
// working tree dirty.
const GENERATED = resolve(PROJECT_ROOT, 'watch-consumer-fixture/generated.ts');
const GENERATED_OK = 'export const generated: number = 1;\n';
const GENERATED_BAD = 'export const generated: string = 1;\n';

const CONSUMER_BUILD_INFO = resolve(PROJECT_ROOT, 'watch-consumer.tsbuildinfo');
// Shared with build-mode.test.ts. Safe because vitest.config.ts sets
// `fileParallelism: false`; if that is ever re-enabled these builds will race.
const EMITTER_BUILD_INFO = resolve(PROJECT_ROOT, 'tsconfig.build-mode.tsbuildinfo');
const DECLARATIONS = resolve(PROJECT_ROOT, 'build-mode-declarations');

const WATCH_SUMMARY = /Found (\d+) errors?\. Watching for file changes\./;

function cleanArtifacts(): void {
  rmSync(DECLARATIONS, { recursive: true, force: true });
  rmSync(EMITTER_BUILD_INFO, { force: true });
  rmSync(CONSUMER_BUILD_INFO, { force: true });
}

/**
 * The root file names recorded in a `.tsbuildinfo`. `root` holds file ids
 * (1-based indices into `fileNames`), either singly or as `[start, end]` ranges.
 */
function readBuildInfoRoots(buildInfoPath: string): string[] {
  const buildInfo = JSON.parse(readFileSync(buildInfoPath, 'utf8')) as {
    fileNames: string[];
    root?: Array<number | [number, number]>;
  };
  const ids: number[] = [];
  for (const entry of buildInfo.root ?? []) {
    if (Array.isArray(entry)) {
      for (let id = entry[0]; id <= entry[1]; id++) ids.push(id);
    } else {
      ids.push(entry);
    }
  }
  return ids.map((id) => buildInfo.fileNames[id - 1]).sort();
}

// Watch-mode coverage for the solution-builder program-reuse patches
// (`tsc-source-patches.ts` — https://github.com/typed-ember/glint/issues/1199).
//
// With programs retained across iterations, every recompile after the first runs
// against a REUSED program — a state stock `tsc -b --watch` never reaches,
// because it releases every program it builds. The consumer project imports the
// referenced project's source through a source-of-project-reference redirect,
// which is the shape whose buildinfo emit crashed ("Cannot read properties of
// undefined (reading 'some')" in `tryAddRoot`) before the include-reasons guard.
describe('ember-tsc --build --watch: iterations against a reused program', () => {
  let proc: ResultPromise<{ reject: false; all: true }> | undefined;
  let exited = false;
  let output = '';
  let cursor = 0;

  function spawnWatch(): void {
    output = '';
    cursor = 0;
    exited = false;
    proc = execa('pnpm', ['ember-tsc', '--build', '--watch', 'tsconfig.watch-consumer.json'], {
      cwd: PROJECT_ROOT,
      reject: false,
      all: true,
    });
    proc.all?.on('data', (chunk: Buffer) => (output += stripAnsi(chunk.toString())));
    void proc.catch(() => {}).finally(() => (exited = true));
  }

  /**
   * Waits for the next "Found N errors. Watching for file changes." line and
   * returns N. Each completed rebuild emits exactly one, and `cursor` only ever
   * moves forward, so this can't re-read a previous iteration's summary — which
   * matters because a file watcher may coalesce edits and matching on
   * diagnostic text alone can then wait forever for output that never comes.
   */
  async function waitForNextSummary(label: string): Promise<number> {
    const deadline = Date.now() + 60_000;
    for (;;) {
      const match = output.slice(cursor).match(WATCH_SUMMARY);
      if (match?.index !== undefined) {
        cursor += match.index + match[0].length;
        return Number(match[1]);
      }
      if (exited) {
        throw new Error(`watch process exited while waiting for ${label}:\n${output}`);
      }
      if (Date.now() > deadline) {
        throw new Error(`timed out waiting for ${label}:\n${output}`);
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  /**
   * Drives two watch iterations: break the generated file, then fix it again.
   * The second rebuild is the one that runs against a reused program.
   */
  async function driveTwoIterations(): Promise<void> {
    writeFileSync(GENERATED, GENERATED_BAD);
    expect(await waitForNextSummary('error after edit'), output).toBeGreaterThan(0);
    expect(output, output).toContain('error TS2322');

    writeFileSync(GENERATED, GENERATED_OK);
    expect(await waitForNextSummary('green after revert'), output).toBe(0);
  }

  afterEach(async () => {
    if (proc?.pid) {
      proc.kill('SIGTERM');
      await proc.catch(() => {});
    }
    proc = undefined;
    rmSync(GENERATED, { force: true });
  });

  // The per-project cache keying and the project-scoped SourceFile cache apply
  // to plain `--build` too, so make sure a multi-project graph still builds —
  // and still builds incrementally off the buildinfo it just wrote.
  test('builds a multi-project reference graph without watch', async () => {
    cleanArtifacts();
    writeFileSync(GENERATED, GENERATED_OK);

    const build = async (): Promise<void> => {
      const result = await execa('pnpm', ['ember-tsc', '--build', 'tsconfig.watch-consumer.json'], {
        cwd: PROJECT_ROOT,
        reject: false,
        all: true,
      });
      const text = stripAnsi(result.all ?? '');
      expect(text, text).not.toMatch(/Cannot read properties of undefined/);
      expect(text, text).not.toMatch(/Debug Failure/);
      expect(result.exitCode, text).toBe(0);
    };

    await build();
    expect(existsSync(CONSUMER_BUILD_INFO)).toBe(true);

    // Both roots of the consumer project must be recorded, and the referenced
    // project must have produced its declarations.
    expect(readBuildInfoRoots(CONSUMER_BUILD_INFO)).toEqual([
      './watch-consumer-fixture/consumer.ts',
      './watch-consumer-fixture/generated.ts',
    ]);
    expect(existsSync(resolve(DECLARATIONS, 'outer.d.ts'))).toBe(true);

    await build();
  }, 120_000);

  test('reports and clears diagnostics across watch iterations without crashing', async () => {
    cleanArtifacts();
    writeFileSync(GENERATED, GENERATED_OK);
    spawnWatch();

    expect(await waitForNextSummary('initial build'), output).toBe(0);

    await driveTwoIterations();

    expect(output).not.toMatch(/Cannot read properties of undefined/);
    expect(output).not.toMatch(/Debug Failure/);
    // The narrowed `tryAddRoot` guard throws with this message rather than
    // silently omitting a root; it must never fire.
    expect(output).not.toMatch(/no file include reasons/);
  }, 120_000);

  // Guards the riskiest part of the reuse patches. `tryAddRoot` tolerates a file
  // whose `fileIncludeReasons` lookup comes back undefined, and the `root` list
  // it builds is persisted into `.tsbuildinfo`. If that tolerance ever swallowed
  // a genuine root, the buildinfo would claim fewer roots than the project has
  // and a later build could consider it up to date when it isn't — a silent
  // failure surfacing much later. So the buildinfo a reused program writes must
  // record exactly the roots a cold build records.
  test('writes the same buildinfo roots as a cold build', async () => {
    cleanArtifacts();
    writeFileSync(GENERATED, GENERATED_OK);

    const cold = await execa('pnpm', ['ember-tsc', '--build', 'tsconfig.watch-consumer.json'], {
      cwd: PROJECT_ROOT,
      reject: false,
      all: true,
    });
    expect(cold.exitCode, stripAnsi(cold.all ?? '')).toBe(0);
    const coldRoots = readBuildInfoRoots(CONSUMER_BUILD_INFO);
    expect(coldRoots.length).toBeGreaterThan(0);

    // Rebuild the same graph under watch, driving two iterations so the final
    // buildinfo is emitted from a reused program.
    cleanArtifacts();
    spawnWatch();
    expect(await waitForNextSummary('initial watch build'), output).toBe(0);
    await driveTwoIterations();

    expect(readBuildInfoRoots(CONSUMER_BUILD_INFO), output).toEqual(coldRoots);
  }, 120_000);
});
