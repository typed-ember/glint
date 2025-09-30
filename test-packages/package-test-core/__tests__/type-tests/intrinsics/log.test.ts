import { Globals, resolve } from '@glint/ember-tsc/-private/dsl';

let log = resolve(Globals['log']);

log('hello', 'world');
