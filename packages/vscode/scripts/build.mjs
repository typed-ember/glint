#!/usr/bin/env node
import { createRequire } from 'node:module';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { context } from 'esbuild';

const require = createRequire(import.meta.url);

const debug = process.argv.includes('--pre-release');
const watch = process.argv.includes('--watch');

// Create build context
const ctx = await context({
  bundle: true,
  entryPoints: {
    'dist/extension': require.resolve('../lib/src/extension.js'),
    'node_modules/glint-tsserver-plugin-pack': '../tsserver-plugin/lib/typescript-server-plugin.js',
    'node_modules/glint-core-pack': '../core/lib/index.js',
  },
  external: ['vscode'],
  logLevel: 'info',
  minify: !debug,
  outdir: fileURLToPath(new URL('../', import.meta.url)),
  platform: 'node',
  sourcemap: debug,
  target: 'node16',

  // Since we're generating CJS, we need to replace any ESM import.meta.url with `__filename`
  // https://github.com/evanw/esbuild/issues/1492#issuecomment-893144483
  inject: [require.resolve('./import-meta-url.js')],
  define: {
    'import.meta.url': 'import_meta_url',
    'GLINT_CORE_PATH': '"glint-core-pack.js"',
  },

  plugins: [
    {
      name: 'resolve-share-module',
      setup(build) {
        build.onResolve({ filter: /^@glint\/core$/ }, () => {
          return { path: 'glint-core-pack', external: true };
        });
      },
    },
  ],
});

if (watch) {
  // Start watch mode
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  // Do a single build
  await ctx.rebuild();
  await ctx.dispose();
}

// Handle SIGINT (Ctrl+C) gracefully
process.on('SIGINT', async () => {
  await ctx.dispose();
  process.exit(0);
});
