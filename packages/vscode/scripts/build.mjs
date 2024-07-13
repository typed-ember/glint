#!/usr/bin/env node
import { createRequire } from 'node:module';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);

const debug = process.argv.includes('--debug');
const watch = process.argv.includes('--watch');

await build({
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
  watch: watch,
});
