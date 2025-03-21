#!/usr/bin/env node
import { createRequire } from 'node:module';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { context } from 'esbuild';

const require = createRequire(import.meta.url);

const debug = process.argv.includes('--debug');
const watch = process.argv.includes('--watch');

// Create build context
const ctx = await context({
  bundle: true,
  entryPoints: {
    'dist/extension': require.resolve('../lib/src/extension.js'),
    'node_modules/glint-tsserver-plugin-pack/index':
      '../tsserver-plugin/lib/typescript-server-plugin.js',
  },
  external: ['vscode'],
  logLevel: 'info',
  minify: !debug,
  outdir: fileURLToPath(new URL('../', import.meta.url)),
  platform: 'node',
  sourcemap: debug,
  target: 'node16',

  plugins: [
    {
      // Copied from:
      // https://github.com/vuejs/language-tools/blob/81a5b6107af83a5e6aa481b18c3ffd717af6bd5d/extensions/vscode/scripts/build.js#L22-L54
      name: 'umd2esm',
      setup(build) {
        build.onResolve(
          { filter: /^(vscode-.*-languageservice|vscode-languageserver-types|jsonc-parser)$/ },
          (args) => {
            const pathUmdMay = require.resolve(args.path, { paths: [args.resolveDir] });
            // Call twice the replace is to solve the problem of the path in Windows
            const pathEsm = pathUmdMay.replace('/umd/', '/esm/').replace('\\umd\\', '\\esm\\');
            return { path: pathEsm };
          },
        );
        build.onResolve({ filter: /^vscode-uri$/ }, (args) => {
          const pathUmdMay = require.resolve(args.path, { paths: [args.resolveDir] });
          // v3
          let pathEsm = pathUmdMay
            .replace('/umd/index.js', '/esm/index.mjs')
            .replace('\\umd\\index.js', '\\esm\\index.mjs');
          if (pathEsm !== pathUmdMay && fs.existsSync(pathEsm)) {
            return { path: pathEsm };
          }
          // v2
          pathEsm = pathUmdMay.replace('/umd/', '/esm/').replace('\\umd\\', '\\esm\\');
          return { path: pathEsm };
        });
      },
    },
    {
      name: 'resolve-share-module',
      setup(build) {
        build.onResolve({ filter: /^@glint\/core$/ }, () => {
          return {
            path: 'vue-language-core-pack',
            external: true,
          };
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
