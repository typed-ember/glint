// @ts-check

// This file is invoked by VSCode itself when configured to run extension
// tests via the `--extensionTestsPath` flag.

const path = require('path');
const { runCLI } = require('jest');
const interceptOutput = require('intercept-stdout');

exports.run = function (runner, callback) {
  let output = '';
  let stopIntercepting = interceptOutput((text) => {
    output += text;
  });

  runCLI({ _: [], $0: 'jest', runInBand: true }, [path.resolve(__dirname, '../..')])
    .then(({ results }) => {
      stopIntercepting();
      console.log(output);
      callback(undefined, results.numFailedTests);
    })
    .catch((error) => callback(error));
};
