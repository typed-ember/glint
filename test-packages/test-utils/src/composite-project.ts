import { symlinkSync } from 'fs';
import * as path from 'path';

import { Project } from './project.js';

export const INPUT_DIR = 'src';
export const INPUT_SFC = path.join(INPUT_DIR, 'index.gts');
export const INPUT_SCRIPT = path.join(INPUT_DIR, 'index.ts');
export const INPUT_TEMPLATE = path.join(INPUT_DIR, 'index.hbs');

export const OUT_DIR = 'dist';
export const INDEX_D_TS = path.join(OUT_DIR, 'index.d.ts');

export const BASE_TS_CONFIG = {
  compilerOptions: {
    strict: true,
    target: 'es2019',
    module: 'es2015',
    moduleResolution: 'node',
    skipLibCheck: true,
    allowJs: true,
    checkJs: false,
    declaration: true,
    emitDeclarationOnly: true,
    incremental: true,
    noEmit: false,
    outDir: OUT_DIR,
  },
  include: [INPUT_DIR],
  glint: { environment: 'ember-template-imports' },
};

export type CompositeProject = {
  root: Project;
  main: Project;
  children: {
    a: Project;
    b: Project;
    c: Project;
  };
};

export async function setupCompositeProject(): Promise<CompositeProject> {
  // Here, we create a `root` project which extends from a shared tsconfig,
  // which we create immediately below, as well as a local-types directory
  // which sets up the environment.
  const SHARED_TSCONFIG = 'shared.tsconfig.json';
  let root = await Project.createExact(
    {
      extends: `./${SHARED_TSCONFIG}`,
      references: [{ path: './main' }],
      include: ['./local-types/**/*'],
      files: [],
    },
    {
      private: true,
      workspaces: ['./main', './a', './b', './c'],
    }
  );

  root.write(SHARED_TSCONFIG, JSON.stringify(BASE_TS_CONFIG, null, 2));
  root.mkdir('local-types');
  root.write('local-types/index.d.ts', 'import "@glint/environment-ember-template-imports";');

  let main = await Project.createExact(
    {
      extends: `../${SHARED_TSCONFIG}`,
      compilerOptions: { composite: true, outDir: OUT_DIR, rootDir: INPUT_DIR },
      include: ['../local-types/**/*', `${INPUT_DIR}/**/*`],
      references: [{ path: '../a' }, { path: '../b' }],
      glint: { environment: 'ember-template-imports' },
    },
    {
      name: '@glint-test/main',
      version: '1.0.0',
      types: `./${INDEX_D_TS}`,
      dependencies: {
        '@glint-test/a': 'link:../a',
        '@glint-test/b': 'link:../b',
      },
    },
    root.filePath('main')
  );

  let a = await Project.createExact(
    {
      extends: `../${SHARED_TSCONFIG}`,
      compilerOptions: { composite: true, outDir: OUT_DIR, rootDir: INPUT_DIR },
      include: ['../local-types/**/*', `${INPUT_DIR}/**/*`],
      references: [{ path: '../c' }],
      glint: { environment: 'ember-template-imports' },
    },
    {
      name: '@glint-test/a',
      version: '1.0.0',
      types: `./${INDEX_D_TS}`,
      dependencies: {
        '@glint-test/c': 'link:../c',
      },
    },
    root.filePath('a')
  );

  let b = await Project.createExact(
    {
      extends: `../${SHARED_TSCONFIG}`,
      compilerOptions: { composite: true, outDir: OUT_DIR, rootDir: INPUT_DIR },
      include: ['../local-types/**/*', `${INPUT_DIR}/**/*`],
      glint: { environment: 'ember-template-imports' },
    },
    {
      name: '@glint-test/b',
      version: '1.0.0',
      types: `./${INDEX_D_TS}`,
    },
    root.filePath('b')
  );

  let c = await Project.createExact(
    {
      extends: `../${SHARED_TSCONFIG}`,
      compilerOptions: { composite: true, outDir: OUT_DIR, rootDir: INPUT_DIR },
      include: ['../local-types/**/*', `${INPUT_DIR}/**/*`],
      glint: { environment: 'ember-template-imports' },
    },
    {
      name: '@glint-test/c',
      version: '1.0.0',
      types: `./${INDEX_D_TS}`,
    },
    root.filePath('c')
  );

  main.mkdir('node_modules/@glint-test');
  symlinkSync(a.filePath('.'), main.filePath('node_modules/@glint-test/a'));
  symlinkSync(b.filePath('.'), main.filePath('node_modules/@glint-test/b'));

  a.mkdir('node_modules/@glint-test');
  symlinkSync(c.filePath('.'), a.filePath('node_modules/@glint-test/c'));

  return { root, main, children: { a, b, c } };
}
