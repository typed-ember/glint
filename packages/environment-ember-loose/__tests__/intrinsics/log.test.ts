import { Globals, resolve } from '@glint/environment-ember-loose/-private/dsl';

let log = resolve(Globals['log']);

log({}, 'hello', 'world');
