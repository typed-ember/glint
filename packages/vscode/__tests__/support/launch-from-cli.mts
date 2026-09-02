import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
  runTests,
} from '@vscode/test-electron';
import * as fs from 'node:fs';

// The TypeScript 7 run needs the TypeScript team's extensions installed in the
// test instance. These ids are what the marketplace serves today; the nightly
// carries the build that supports content mappers.
const TYPESCRIPT_7_EXTENSION_IDS = [
  'TypeScriptTeam.native-preview',
  'TypeScriptTeam.vscode-typescript-nightly',
];

const ts7 = process.argv.includes('--ts7');

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

const testRunner = ts7
  ? 'lib/__tests__/support/vscode-runner-ts7.js'
  : 'lib/__tests__/support/vscode-runner-ts-plugin.js';

const workspace = ts7
  ? path.resolve(packageRoot, '../../test-packages/ts7-content-mapper-app')
  : `${packageRoot}/__fixtures__/ember-app`;

fs.writeFileSync(path.join(settingsDir, 'settings.json'), JSON.stringify(userPreferences, null, 2));

try {
  const vscodeExecutablePath = await downloadAndUnzipVSCode();

  if (ts7) {
    const cliArgs = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
    const installArgs = ['--extensions-dir', emptyExtensionsDir];
    for (const id of TYPESCRIPT_7_EXTENSION_IDS) {
      installArgs.push('--install-extension', id);
    }
    const result = spawnSync(cliArgs[0], cliArgs.slice(1).concat(installArgs), {
      encoding: 'utf-8',
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    if (result.status !== 0) {
      throw new Error(`Installing ${TYPESCRIPT_7_EXTENSION_IDS.join(', ')} failed`);
    }
  }

  await runTests({
    vscodeExecutablePath,
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
      workspace,
    ],
  });
} catch (error) {
  console.error('Failed to launch tests:', error);
  process.exit(1);
}
