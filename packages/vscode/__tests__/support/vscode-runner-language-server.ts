// This file is invoked by VSCode itself when configured to run extension
// tests via the `--extensionTestsPath` flag.

import { run as runShared } from './vscode-runner';

export function run(runner: unknown, callback: (error: unknown, failures?: number) => void): void {
  runShared(runner, callback, 'language-server-tests');
}
