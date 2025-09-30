#!/usr/bin/env node
import { createRequire } from 'node:module';
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { context } from 'esbuild';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const debug = process.argv.includes('--pre-release');
const watch = process.argv.includes('--watch');

// Create build context
const ctx = await context({
  bundle: true,
  entryPoints: {
    'dist/extension': require.resolve('../lib/src/extension.js'),
    'node_modules/glint-tsserver-plugin-pack/index':
      '../tsserver-plugin/lib/typescript-server-plugin.js',
    'node_modules/glint-ember-tsc-pack/index': '../core/lib/index.js',
  },
  external: ['vscode'],
  logLevel: 'info',
  minify: !debug,
  outdir: fileURLToPath(new URL('../', import.meta.url)),
  platform: 'node',
  sourcemap: false,
  target: 'node16',

  // Since we're generating CJS, we need to replace any ESM import.meta.url with `__filename`
  // https://github.com/evanw/esbuild/issues/1492#issuecomment-893144483
  inject: [require.resolve('./import-meta-url.js')],
  define: {
    'import.meta.url': 'import_meta_url',
    EMBER_TSC_PATH: '"glint-ember-tsc-pack/index.js"',
  },

  plugins: [
    {
      name: 'resolve-share-module',
      setup(build) {
        build.onResolve({ filter: /^@glint\/core$/ }, () => {
          return { path: 'glint-ember-tsc-pack', external: true };
        });
      },
    },
  ],
});

// `@glint/ember-tsc` depends on `content-tag` which is a wasm module.
// The .wasm library itself doesn't get automatically bundled via the code
// above and needs a manual copy step.
async function copyWasmFile() {
  const sourceWasm = join(
    __dirname,
    '../../core/node_modules/content-tag/pkg/node/content_tag_bg.wasm',
  );
  const targetDir = join(__dirname, '../node_modules/glint-ember-tsc-pack');
  const targetWasm = join(targetDir, 'content_tag_bg.wasm');

  try {
    await mkdir(targetDir, { recursive: true });
    await copyFile(sourceWasm, targetWasm);
    console.log('Copied WASM file to glint-ember-tsc-pack');
  } catch (error) {
    console.error('Failed to copy WASM file:', error);
  }
}

if (watch) {
  // Start watch mode
  await ctx.watch();
  await copyWasmFile();
  console.log('Watching for changes...');
} else {
  // Do a single build
  await ctx.rebuild();
  await copyWasmFile();
  await ctx.dispose();
}

// Handle SIGINT (Ctrl+C) gracefully
process.on('SIGINT', async () => {
  await ctx.dispose();
  process.exit(0);
});
