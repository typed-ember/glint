import { Globals, resolve } from '@glint/environment-ember-loose/types';

let log = resolve(Globals['log']);

log({}, 'hello', 'world');
