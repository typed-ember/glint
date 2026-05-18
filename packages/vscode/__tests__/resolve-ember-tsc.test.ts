import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { findEmberTscByWalkingUp, resolveEmberTscServerPath } from '../src/resolve-ember-tsc';

const SERVER_REL = path.join('node_modules', '@glint', 'ember-tsc', 'bin', 'glint-language-server');

function makeEmberTscInstall(rootDir: string): string {
  const binPath = path.join(rootDir, SERVER_REL);
  const pkgJson = path.join(rootDir, 'node_modules', '@glint', 'ember-tsc', 'package.json');
  fs.mkdirSync(path.dirname(binPath), { recursive: true });
  fs.writeFileSync(binPath, '#!/usr/bin/env node\n');
  fs.writeFileSync(
    pkgJson,
    JSON.stringify({
      name: '@glint/ember-tsc',
      version: '0.0.0-test',
      bin: { 'glint-language-server': './bin/glint-language-server' },
    }),
  );
  fs.writeFileSync(
    path.join(rootDir, 'package.json'),
    JSON.stringify({ name: 'host', version: '0.0.0' }),
  );
  return binPath;
}

describe('resolveEmberTscServerPath', () => {
  let tmpRoot: string;
  const bundledServerPath = '/bundled/glint-language-server.js';

  beforeEach(() => {
    tmpRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'glint-resolve-')));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('uses bundled server when source is "bundled"', () => {
    const workspaceRoot = tmpRoot;
    makeEmberTscInstall(workspaceRoot); // present but ignored
    const result = resolveEmberTscServerPath({
      workspaceRoot,
      libraryPath: '.',
      emberTscSource: 'bundled',
      bundledServerPath,
    });
    assert.equal(result.source, 'bundled');
    assert.equal(result.path, bundledServerPath);
    assert.equal(result.usedFallback, false);
    assert.equal(result.autoDiscovered, false);
  });

  it('resolves from the configured libraryPath', () => {
    const workspaceRoot = tmpRoot;
    const uiDir = path.join(workspaceRoot, 'ui');
    fs.mkdirSync(uiDir, { recursive: true });
    const binPath = makeEmberTscInstall(uiDir);

    const result = resolveEmberTscServerPath({
      workspaceRoot,
      libraryPath: 'ui',
      emberTscSource: 'workspace',
      bundledServerPath,
    });
    assert.equal(result.source, 'workspace');
    assert.equal(result.path, binPath);
    assert.equal(result.usedFallback, false);
    assert.equal(result.autoDiscovered, false);
  });

  it('auto-discovers ember-tsc by walking up from the active file', () => {
    const workspaceRoot = tmpRoot;
    const uiDir = path.join(workspaceRoot, 'ui');
    const deepDir = path.join(uiDir, 'app', 'components');
    fs.mkdirSync(deepDir, { recursive: true });
    const binPath = makeEmberTscInstall(uiDir);
    const activeFile = path.join(deepDir, 'foo.gts');
    fs.writeFileSync(activeFile, '<template>hi</template>');

    const result = resolveEmberTscServerPath({
      workspaceRoot,
      libraryPath: '.',
      emberTscSource: 'auto',
      activeFileFsPath: activeFile,
      bundledServerPath,
    });
    assert.equal(result.source, 'workspace');
    assert.equal(result.path, binPath);
    assert.equal(result.autoDiscovered, true);
    assert.equal(result.usedFallback, false);
    assert.equal(result.resolutionDir, uiDir);
  });

  it('auto-discovers from a .gjs file too', () => {
    const workspaceRoot = tmpRoot;
    const uiDir = path.join(workspaceRoot, 'web');
    const deepDir = path.join(uiDir, 'app');
    fs.mkdirSync(deepDir, { recursive: true });
    makeEmberTscInstall(uiDir);
    const activeFile = path.join(deepDir, 'bar.gjs');
    fs.writeFileSync(activeFile, '<template>hi</template>');

    const result = resolveEmberTscServerPath({
      workspaceRoot,
      libraryPath: '.',
      emberTscSource: 'auto',
      activeFileFsPath: activeFile,
      bundledServerPath,
    });
    assert.equal(result.autoDiscovered, true);
    assert.equal(result.resolutionDir, uiDir);
  });

  it('falls back to bundled when no workspace install exists', () => {
    const workspaceRoot = tmpRoot;
    fs.writeFileSync(path.join(workspaceRoot, 'package.json'), JSON.stringify({ name: 'host' }));
    const activeFile = path.join(workspaceRoot, 'app', 'x.gts');
    fs.mkdirSync(path.dirname(activeFile), { recursive: true });
    fs.writeFileSync(activeFile, '');

    const result = resolveEmberTscServerPath({
      workspaceRoot,
      libraryPath: '.',
      emberTscSource: 'auto',
      activeFileFsPath: activeFile,
      bundledServerPath,
    });
    assert.equal(result.source, 'bundled');
    assert.equal(result.path, bundledServerPath);
    assert.equal(result.usedFallback, true);
    assert.equal(result.autoDiscovered, false);
  });

  it('does not auto-discover in "workspace" mode (only honors configured libraryPath)', () => {
    const workspaceRoot = tmpRoot;
    const uiDir = path.join(workspaceRoot, 'ui');
    fs.mkdirSync(uiDir, { recursive: true });
    makeEmberTscInstall(uiDir);
    const activeFile = path.join(uiDir, 'foo.gts');
    fs.writeFileSync(activeFile, '');

    const result = resolveEmberTscServerPath({
      workspaceRoot,
      libraryPath: '.', // workspace root has no @glint
      emberTscSource: 'workspace',
      activeFileFsPath: activeFile,
      bundledServerPath,
    });
    // Workspace mode failed to find at root; falls back to bundled, never walks up.
    assert.equal(result.source, 'bundled');
    assert.equal(result.usedFallback, true);
    assert.equal(result.autoDiscovered, false);
  });

  it('does not walk up past the workspace root', () => {
    // Install lives ABOVE the workspace root — `findEmberTscByWalkingUp`
    // must not pick it up. (Note: Node's standard `require.resolve` _will_
    // walk up the `node_modules` chain — that's intentional and handled by
    // the primary resolution path, not by the walk-up fallback.)
    const workspaceRoot = path.join(tmpRoot, 'workspace');
    fs.mkdirSync(workspaceRoot, { recursive: true });
    makeEmberTscInstall(tmpRoot);

    const activeFile = path.join(workspaceRoot, 'app', 'x.gts');
    fs.mkdirSync(path.dirname(activeFile), { recursive: true });
    fs.writeFileSync(activeFile, '');

    assert.equal(findEmberTscByWalkingUp(activeFile, workspaceRoot), undefined);
  });
});

describe('findEmberTscByWalkingUp', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'glint-walkup-')));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('returns undefined when start is outside stopDir', () => {
    const stop = path.join(tmpRoot, 'a');
    const outside = path.join(tmpRoot, 'b', 'file.gts');
    fs.mkdirSync(path.dirname(outside), { recursive: true });
    fs.mkdirSync(stop, { recursive: true });
    fs.writeFileSync(outside, '');
    assert.equal(findEmberTscByWalkingUp(outside, stop), undefined);
  });

  it('picks the nearest install when multiple ancestors have one', () => {
    const outer = tmpRoot;
    const inner = path.join(outer, 'ui');
    fs.mkdirSync(inner, { recursive: true });
    makeEmberTscInstall(outer);
    const innerBin = makeEmberTscInstall(inner);

    const file = path.join(inner, 'app', 'x.gts');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '');

    const found = findEmberTscByWalkingUp(file, outer);
    assert.ok(found);
    assert.equal(found.serverPath, innerBin);
    assert.equal(found.resolutionDir, inner);
  });
});
