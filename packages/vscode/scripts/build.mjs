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
  },
  external: ['vscode'],
  logLevel: 'info',
  minify: !debug,
  outdir: fileURLToPath(new URL('../', import.meta.url)),
  platform: 'node',
  sourcemap: debug,
  target: 'node16',
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
