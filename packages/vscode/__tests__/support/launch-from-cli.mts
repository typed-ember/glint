import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { runTests } from '@vscode/test-electron';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(dirname, '../../..');
const emptyTempDir = path.join(os.tmpdir(), `user-data-${Math.random()}`);

try {
  await runTests({
    extensionDevelopmentPath: packageRoot,
    extensionTestsPath: path.resolve(dirname, 'vscode-runner.js'),
    launchArgs: [
      // Don't show the "hey do you trust this folder?" prompt
      '--disable-workspace-trust',
      // Explicitly turn off the built-in TS extension
      '--disable-extension',
      'vscode.typescript-language-features',
      // Point at an empty directory so no third-party extensions load
      '--extensions-dir',
      emptyTempDir,
      // Point at an empty directory so we don't have to contend with any local user preferences
      '--user-data-dir',
      emptyTempDir,
      // Load the app fixtures
      `${packageRoot}/__fixtures__/ember-app`,
      `${packageRoot}/__fixtures__/template-imports-app`,
    ],
  });
} catch (error) {
  console.error('Failed to launch tests:', error);
  process.exit(1);
}
