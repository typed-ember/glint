// @ts-check

const path = require('path');
const os = require('os');
const { runTests } = require('vscode-test');

async function main() {
  let emptyTempDir = path.join(os.tmpdir(), `user-data-${Math.random()}`);

  try {
    await runTests({
      extensionDevelopmentPath: path.resolve(__dirname, '../..'),
      extensionTestsPath: path.resolve(__dirname, 'vscode-runner.js'),
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
        // Load the Ember and GlimmerX app fixtures
        `${__dirname}/../../__fixtures__/ember-app`,
        `${__dirname}/../../__fixtures__/js-glimmerx-app`,
      ],
    });
  } catch (error) {
    console.error('Failed to launch tests:', error);
    process.exit(1);
  }
}

main();
