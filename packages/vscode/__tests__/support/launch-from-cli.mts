import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { runTests } from '@vscode/test-electron';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(dirname, '../../..');
const emptyTempDir = path.join(os.tmpdir(), `user-data-${Math.random()}`);

const testType = process.argv[2];

let testRunner: string;
switch (testType) {
  case 'language-server':
    testRunner = 'vscode-runner-language-server.js';
    break;
  case 'ts-plugin':
    testRunner = 'vscode-runner-ts-plugin.js';
    break;
  default:
    console.error('Test type must be either "language-server" or "ts-plugin"');
    process.exit(1);
}

try {
  await runTests({
    extensionDevelopmentPath: packageRoot,
    extensionTestsPath: path.resolve(dirname, testRunner),
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
