import { afterEach, describe, expect, test } from 'vitest';
import { type ChildProcess, spawn } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(__dirname, '..');
const CONSUMER = resolve(PROJECT_ROOT, 'watch-consumer-fixture/consumer.ts');

// Watch-mode regression coverage for the solution-builder program-reuse
// patches (patchTscSolutionBuilderWatchReuse / patchProxyPerProjectCaches in
// run-volar-tsc.ts — https://github.com/typed-ember/glint/issues/1199).
//
// With programs retained across iterations, each recompile runs against a
// REUSED program — a state stock `tsc -b --watch` never reaches (it releases
// every program). The consumer project imports the referenced project's
// source through a source-of-project-reference redirect, which is exactly the
// shape whose buildinfo emit crashed ("Cannot read properties of undefined
// (reading 'some')" in tryAddRoot) before the include-reasons guard.
describe('ember-tsc --build --watch: iterations against a reused program', () => {
	let child: ChildProcess | undefined;
	const originalConsumer = readFileSync(CONSUMER, 'utf8');

	afterEach(() => {
		child?.kill();
		writeFileSync(CONSUMER, originalConsumer);
	});

	test('reports and clears diagnostics across watch iterations without crashing', async () => {
		rmSync(resolve(PROJECT_ROOT, 'build-mode-declarations'), { recursive: true, force: true });
		rmSync(resolve(PROJECT_ROOT, 'tsconfig.build-mode.tsbuildinfo'), { force: true });
		rmSync(resolve(PROJECT_ROOT, 'watch-consumer.tsbuildinfo'), { force: true });

		child = spawn('pnpm', ['ember-tsc', '--build', '--watch', 'tsconfig.watch-consumer.json'], {
			cwd: PROJECT_ROOT,
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		let output = '';
		let exited: string | undefined;
		child.stdout!.on('data', (chunk: Buffer) => (output += chunk.toString()));
		child.stderr!.on('data', (chunk: Buffer) => (output += chunk.toString()));
		child.on('exit', (code, signal) => (exited = `exit code=${code} signal=${signal}`));

		const waitFor = async (predicate: (text: string) => boolean, label: string): Promise<void> => {
			const deadline = Date.now() + 60_000;
			while (!predicate(output)) {
				if (exited) {
					throw new Error(`watch process died while waiting for ${label} (${exited}):\n${output}`);
				}
				if (Date.now() > deadline) {
					throw new Error(`timed out waiting for ${label}:\n${output}`);
				}
				await new Promise((r) => setTimeout(r, 250));
			}
		};

		// Initial build settles green.
		await waitFor((text) => text.includes('Found 0 errors'), 'initial green build');

		// Iteration 1: introduce a type error -> reported.
		let marker = output.length;
		writeFileSync(CONSUMER, originalConsumer + '\nexport const two: string = 2;\n');
		await waitFor(
			(text) => text.slice(marker).includes('error TS2322'),
			'error reported after edit',
		);

		// Iteration 2 (program now reused): revert -> green again, no crash.
		marker = output.length;
		writeFileSync(CONSUMER, originalConsumer);
		await waitFor((text) => text.slice(marker).includes('Found 0 errors'), 'green after revert');

		expect(output).not.toMatch(/Cannot read properties of undefined/);
		expect(output).not.toMatch(/Debug Failure/);
		expect(exited).toBeUndefined();
	}, 120_000);
});
