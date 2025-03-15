import { defineConfig } from 'vitest/config';
export default defineConfig({
    esbuild: {
        target: 'node18',
    },
    test: {
        exclude: ['__tests__/type-tests'],
    },
});
//# sourceMappingURL=vitest.config.js.map