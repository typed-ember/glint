import * as VM from '@glint/template/-private/keywords';
import Registry from './registry';

interface Keywords {
  component: VM.ComponentKeyword;
  debugger: VM.DebuggerKeyword;
  each: VM.EachKeyword;
  hasBlock: VM.HasBlockKeyword;
  'has-block': VM.HasBlockKeyword;
  'has-block-params': VM.HasBlockParamsKeyword;
  // the `if` keyword is implemented directly in @glint/transform
  'in-element': VM.InElementKeyword;
  let: VM.LetKeyword;
  unless: void; // TODO: should this be implemented as `if (!...)`?
  with: VM.WithKeyword;
  // the `yield` keyword is implemented directly in @glint/transform
}

export interface Globals extends Keywords, Registry {
}

export declare const Globals: Globals;
