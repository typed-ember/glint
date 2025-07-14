import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    target: 'node18',
  },
  test: {
    exclude: [
      '__tests__/type-tests',

      // Default `exclude` options (https://vitest.dev/config/#exclude)
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
    ],
  },
});
