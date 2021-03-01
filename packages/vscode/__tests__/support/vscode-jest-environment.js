// @ts-check

const NodeEnvironment = require('jest-environment-node');
const vscode = require('vscode');

module.exports = class VSCodeEnvironment extends NodeEnvironment {
  getVmContext() {
    return Object.assign(super.getVmContext(), { vscode });
  }
};
