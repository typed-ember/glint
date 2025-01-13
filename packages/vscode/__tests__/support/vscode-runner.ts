// This file is invoked by VSCode itself when configured to run extension
// tests via the `--extensionTestsPath` flag.

import * as path from 'node:path';
import * as glob from 'glob';
import Mocha = require('mocha');

export function run(
  runner: unknown,
  callback: (error: unknown, failures?: number) => void,
  testSubfolder: 'language-server-tests' | 'ts-plugin-tests',
): void {
  try {
    let mocha = new Mocha({ color: true, slow: 3_000, timeout: 30_000 });
    let tests = path.resolve(__dirname, '..').replace(/\\/g, '/');

    for (let testFile of glob.sync(`${tests}/${testSubfolder}/**/*.test.js`)) {
      if (process.platform === 'win32') {
        // Mocha is weird about drive letter casing under Windows
        testFile = testFile[0].toLowerCase() + testFile.slice(1);
      }

      mocha.addFile(testFile);
    }

    mocha.run((failures) => callback(null, failures));
  } catch (error) {
    console.error(error);
    callback(error);
  }
}
