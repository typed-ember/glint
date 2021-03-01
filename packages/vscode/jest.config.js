/* eslint-env node */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: './__tests__/support/vscode-jest-environment',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^vscode$': '<rootDir>/__tests__/support/vscode-shim.js',
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/__tests__/tsconfig.json',
    },
  },
};
