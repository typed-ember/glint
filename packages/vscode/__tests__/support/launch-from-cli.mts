import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { runTests } from '@vscode/test-electron';
import * as fs from 'node:fs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(dirname, '../../..');
const emptyExtensionsDir = path.join(os.tmpdir(), `extensions-${Math.random()}`);
const emptyUserDataDir = path.join(os.tmpdir(), `user-data-${Math.random()}`);

const settingsDir = path.join(emptyUserDataDir, 'User');
fs.mkdirSync(settingsDir, { recursive: true });

const userPreferences = {
  // "typescript.tsserver.log": "verbose",
};

fs.writeFileSync(path.join(settingsDir, 'settings.json'), JSON.stringify(userPreferences, null, 2));

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
      emptyExtensionsDir,
      // Point at an empty directory so we don't have to contend with any local user preferences
      '--user-data-dir',
      emptyUserDataDir,
      // Load the app fixtures. Note that it's ok to load fixtures that aren't used for the
      // particular test type.
      `${packageRoot}/__fixtures__/ember-app`,
      `${packageRoot}/__fixtures__/template-imports-app`,
      `${packageRoot}/__fixtures__/template-imports-app-ts-plugin`,
    ],
  });
} catch (error) {
  console.error('Failed to launch tests:', error);
  process.exit(1);
}
