import * as path from 'node:path';
import * as os from 'node:os';
import { runTests } from '@vscode/test-electron';
import * as fs from 'node:fs';

const packageRoot = path.resolve(process.cwd());
const emptyExtensionsDir = path.join(os.tmpdir(), `extensions-${Math.random()}`);
const emptyUserDataDir = path.join(os.tmpdir(), `user-data-${Math.random()}`);

const settingsDir = path.join(emptyUserDataDir, 'User');
fs.mkdirSync(settingsDir, { recursive: true });

const userPreferences = {
  // When testing TS Plugin, it can be useful to look at tsserver logs within
  // the test runner VSCode instance. To do this, uncomment the following line,
  // and then check the logs for TypeScript
  // "typescript.tsserver.log": "verbose",
};

fs.writeFileSync(path.join(settingsDir, 'settings.json'), JSON.stringify(userPreferences, null, 2));

const testType = process.argv[2];

let disableExtensionArgs: string[] = [];

let testRunner: string;
switch (testType) {
  case 'language-server':
    testRunner = 'lib/__tests__/support/vscode-runner-language-server.js';

    // Disable vanilla TS for full "takeover" mode.
    disableExtensionArgs = ['--disable-extension', 'vscode.typescript-language-features'];
    break;
  case 'ts-plugin':
    testRunner = 'lib/__tests__/support/vscode-runner-ts-plugin.js';

    // Note: here, we WANT vanilla TS to be enabled since we're testing the TS Plugin.
    break;
  default:
    console.error('Test type must be either "language-server" or "ts-plugin"');
    process.exit(1);
}

try {
  runTests({
    extensionDevelopmentPath: packageRoot,
    extensionTestsPath: path.resolve(process.cwd(), testRunner),
    launchArgs: [
      // Don't show the "hey do you trust this folder?" prompt
      '--disable-workspace-trust',
      ...disableExtensionArgs,
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
      `${packageRoot}/__fixtures__/ember-app-loose-and-gts`,
    ],
  });
} catch (error) {
  console.error('Failed to launch tests:', error);
  process.exit(1);
}
