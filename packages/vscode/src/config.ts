// `reactive-vscode` ships a CommonJS build but only ESM-flavored types. This
// package is emitted as CommonJS and uses `defineConfigObject` synchronously, so
// we take the types via a type-only (import-mode) import and the runtime value
// via `require`, which resolves to the package's CommonJS build.
import type * as ReactiveVscode from 'reactive-vscode' with { 'resolution-mode': 'import' };
import { NestedScopedConfigs, scopedConfigs } from './generated-meta';

const { defineConfigObject } = require('reactive-vscode') as typeof ReactiveVscode;

export const config = defineConfigObject<NestedScopedConfigs>(
  scopedConfigs.scope,
  scopedConfigs.defaults,
);
