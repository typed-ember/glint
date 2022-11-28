export default {
  preset: 'ts-jest',
  testEnvironment: './__tests__/support/vscode-jest-environment.cjs',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^vscode$': '<rootDir>/__tests__/support/vscode-shim.cjs',
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/__tests__/tsconfig.json',
    },
  },
};
