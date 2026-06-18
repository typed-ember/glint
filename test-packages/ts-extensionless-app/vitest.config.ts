import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 60_000,
    hookTimeout: 60_000,
    include: ['__tests__/**/*.test.ts'],
    // Both watch.test.ts and content-tag-errors.test.ts write temporary files
    // into `src/` and run `ember-tsc` against this project; running them in
    // parallel makes them see each other's files. Serialize across files.
    fileParallelism: false,
  },
});
