/* eslint-env node */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  // Don't restart tests when the source changes; wait and let
  // tsc emitting new .js files trigger a run instead.
  watchPathIgnorePatterns: ['<rootDir>/src/.*'],
};
