/* eslint-env node */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  // For the CLI, don't restart tests when the source changes; wait and let
  // tsc emitting new .js files trigger a run instead since we need to invoke
  // the built executable script.
  watchPathIgnorePatterns: ['<rootDir>/src/cli/.*'],
};
