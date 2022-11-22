import { Globals } from '@glint/environment-ember-loose/-private/dsl';

import '@ember/modifier';
type EELOn = typeof Globals.on;
declare module '@ember/modifier' {
  export interface OnModifier extends EELOn {}
}

import '@ember/helper';
type EELConcat = typeof Globals.concat;
type EELFn = typeof Globals.fn;
type EELGet = typeof Globals.get;
declare module '@ember/helper' {
  // export interface ArrayHelper extends EELArray {}
  export interface ConcatHelper extends EELConcat {}
  export interface FnHelper extends EELFn {}
  export interface GetHelper extends EELGet {}
  // export interface HashHelper extends EELHash {}
}

import '@ember/component';
type EELInput = typeof Globals.Input;
type EELTextarea = typeof Globals.Textarea;
declare module '@ember/component' {
  export interface Input extends EELInput {}
  export interface Textarea extends EELTextarea {}
}

import '@ember/routing';
type EELLinkTo = typeof Globals.LinkTo;
declare module '@ember/routing' {
  export interface LinkTo extends EELLinkTo {}
}
