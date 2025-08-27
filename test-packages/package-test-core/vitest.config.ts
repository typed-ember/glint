import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    target: 'node14',
  },
  test: {
    // For the CLI, don't restart tests when the source changes; wait and let
    // tsc emitting new .js files trigger a run instead since we need to invoke
    // the built executable script.
    watchExclude: ['src/cli/**'],
    testTimeout: 30_000,

    poolOptions: {
      // Copied these from Vue; anecdotally (according to Vue
      // maintainers) they actually speed things up for the
      // kinds of Language Server / tsserver tests we run, but more importantly
      // our reuse of the shared tsserver instance (via tsserver harness) means
      // we can't be running tests in parallel.
      forks: {
        singleFork: true,
        isolate: false,
      },
    },

    exclude: [
      // type tests are run as part of the test:typecheck script, but it causes issues if vitest tries to evaluate these files
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
