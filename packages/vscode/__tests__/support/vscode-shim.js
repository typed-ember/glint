// This file exists, in combination with `vscode-jest-environment`, to make
// the `vscode` import that's injected by Code actually available to the
// running tests.

module.exports = global.vscode;
