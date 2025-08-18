import { Globals, resolve } from '@glint/environment-ember-template-imports/-private/dsl';

let log = resolve(Globals['log']);

log('hello', 'world');
