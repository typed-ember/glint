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
    testTimeout: 20_000,
  },
});
