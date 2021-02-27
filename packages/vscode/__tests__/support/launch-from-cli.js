// @ts-check

const path = require('path');
const os = require('os');
const { runTests } = require('vscode-test');

async function main() {
  let dataDir = path.join(os.tmpdir(), `user-data-${Math.random()}`);

  try {
    await runTests({
      extensionDevelopmentPath: path.resolve(__dirname, '../..'),
      extensionTestsPath: path.resolve(__dirname, 'vscode-runner.js'),
      launchArgs: [
        '--disable-extensions',
        '--user-data-dir',
        dataDir,
        `${__dirname}/../../__fixtures__/ember-app`,
      ],
    });
  } catch (error) {
    console.error('Failed to launch tests:', error);
    process.exit(1);
  }
}

main();
