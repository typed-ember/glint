import { Globals, resolve } from '@glint/core/environment-ember-template-imports/-private/dsl';

let log = resolve(Globals['log']);

log('hello', 'world');
