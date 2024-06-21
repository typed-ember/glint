'use strict';

module.exports = {
  root: true,
  overrides: [
    // ESM files
    {
      files: ['*.js'],
      parser: '@babel/eslint-parser',
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        requireConfigFile: false,
        babelOptions: {
          presets: ['@babel/preset-env'],
        },
      },
      extends: ['eslint:recommended', 'plugin:prettier/recommended'],
      env: {
        browser: false,
        node: true,
      },
    },
    // CJS files
    {
      files: ['**/*.cjs'],
      parserOptions: {
        sourceType: 'script',
      },
      env: {
        browser: false,
        node: true,
      },
      plugins: ['n'],
      extends: ['eslint:recommended', 'plugin:n/recommended'],
    },
  ],
};
