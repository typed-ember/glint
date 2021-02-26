// @ts-check

const path = require('path');
const { runTests } = require('vscode-test');

async function main() {
  try {
    await runTests({
      extensionDevelopmentPath: path.resolve(__dirname, '../..'),
      extensionTestsPath: path.resolve(__dirname, 'vscode-runner.js'),
      launchArgs: ['--disable-extensions', `${__dirname}/../__fixtures__/ember-app`],
    });
  } catch (error) {
    console.error('Failed to launch tests:', error);
    process.exit(1);
  }
}

main();
