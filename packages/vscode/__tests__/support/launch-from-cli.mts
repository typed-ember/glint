import * as path from 'node:path';
import * as os from 'node:os';
import { runTests } from '@vscode/test-electron';
import * as fs from 'node:fs';

const packageRoot = path.resolve(process.cwd());
const emptyExtensionsDir = path.join(os.tmpdir(), `extensions-${Math.random()}`);
const emptyUserDataDir = path.join(os.tmpdir(), `user-data-${Math.random()}`);

const settingsDir = path.join(emptyUserDataDir, 'User');
fs.mkdirSync(settingsDir, { recursive: true });

const userPreferences: Record<string, any> = {
  // When testing TS Plugin, it can be useful to look at tsserver logs within
  // the test runner VSCode instance. To do this, uncomment the following line,
  // and then check Output > Typescript for semantic logfile location.
  // 'typescript.tsserver.log': 'verbose',
};

let disableExtensionArgs: string[] = [];

let testRunner = 'lib/__tests__/support/vscode-runner-ts-plugin.js';

fs.writeFileSync(path.join(settingsDir, 'settings.json'), JSON.stringify(userPreferences, null, 2));

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
      `${packageRoot}/__fixtures__/ember-app`,
    ],
  });
} catch (error) {
  console.error('Failed to launch tests:', error);
  process.exit(1);
}
