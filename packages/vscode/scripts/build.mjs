#!/usr/bin/env node
import { createRequire } from 'node:module';
import { copyFile, cp, mkdir } from 'node:fs/promises';
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
    'node_modules/glint-ember-tsc-pack/bin/glint-language-server':
      '../core/bin/glint-language-server.js',
    'node_modules/glint-ember-tsc-pack/language-server': '../core/lib/volar/language-server.js',
  },
  external: ['vscode'],
  logLevel: 'info',
  mainFields: ['module', 'main'],
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
  const targetBinDir = join(targetDir, 'bin');
  const targetBinWasm = join(targetBinDir, 'content_tag_bg.wasm');

  try {
    await mkdir(targetDir, { recursive: true });
    await mkdir(targetBinDir, { recursive: true });
    await copyFile(sourceWasm, targetWasm);
    await copyFile(sourceWasm, targetBinWasm);
    console.log('Copied WASM file to glint-ember-tsc-pack');
  } catch (error) {
    console.error('Failed to copy WASM file:', error);
  }
}

async function copyHtmlLanguageService() {
  try {
    // Find vscode-html-languageservice dynamically in pnpm store
    const workspaceRoot = join(__dirname, '../../../');
    const pnpmDir = join(workspaceRoot, 'node_modules/.pnpm');

    // Find the vscode-html-languageservice directory
    const fs = await import('node:fs/promises');
    const files = await fs.readdir(pnpmDir);
    const htmlServiceDir = files.find((f) => f.startsWith('vscode-html-languageservice@'));

    if (!htmlServiceDir) {
      console.warn('vscode-html-languageservice not found in pnpm store');
      return;
    }

    // Copy the entire vscode-html-languageservice package with its node_modules dependencies
    // Use dereference: true to follow symlinks and avoid circular reference issues with pnpm
    const sourceDir = join(pnpmDir, htmlServiceDir, 'node_modules');
    const targetDir = join(__dirname, '../node_modules/glint-ember-tsc-pack/node_modules');

    // Remove target directory if it exists to avoid symlink conflicts
    try {
      await fs.rm(targetDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore if directory doesn't exist
    }

    await mkdir(targetDir, { recursive: true });
    await cp(sourceDir, targetDir, { recursive: true, dereference: true });
    console.log('Copied vscode-html-languageservice and its dependencies to glint-ember-tsc-pack');
  } catch (error) {
    console.error('Failed to copy vscode-html-languageservice files:', error);
  }
}

async function copyTypeScript() {
  try {
    // Find TypeScript dynamically in pnpm store
    const workspaceRoot = join(__dirname, '../../../');
    const pnpmDir = join(workspaceRoot, 'node_modules/.pnpm');

    const fs = await import('node:fs/promises');
    const files = await fs.readdir(pnpmDir);
    const tsDir = files.find((f) => f.startsWith('typescript@'));

    if (!tsDir) {
      console.warn('TypeScript not found in pnpm store');
      return;
    }

    // Copy the entire TypeScript package with its dependencies
    const sourceDir = join(pnpmDir, tsDir, 'node_modules');
    const targetDir = join(__dirname, '../node_modules/glint-ember-tsc-pack/node_modules');

    await mkdir(targetDir, { recursive: true });
    await cp(sourceDir, targetDir, { recursive: true, dereference: true });
    console.log('Copied TypeScript to glint-ember-tsc-pack');
  } catch (error) {
    console.error('Failed to copy TypeScript files:', error);
  }
}

if (watch) {
  // Start watch mode
  await ctx.watch();
  await copyWasmFile();
  await copyHtmlLanguageService();
  await copyTypeScript();
  console.log('Watching for changes...');
} else {
  // Do a single build
  await ctx.rebuild();
  await copyWasmFile();
  await copyHtmlLanguageService();
  await copyTypeScript();
  await ctx.dispose();
}

// Handle SIGINT (Ctrl+C) gracefully
process.on('SIGINT', async () => {
  await ctx.dispose();
  process.exit(0);
});
