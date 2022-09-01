import * as VM from '@glint/template/-private/keywords';

interface Keywords {
  component: VM.ComponentKeyword;
  debugger: VM.DebuggerKeyword;
  each: VM.EachKeyword;
  'has-block': VM.HasBlockKeyword;
  'has-block-params': VM.HasBlockParamsKeyword;
  if: void; // the `if` keyword is implemented directly in @glint/transform
  'in-element': VM.InElementKeyword;
  let: VM.LetKeyword;
  unless: void; // the `unless` keyword is implemented directly in @glint/transform
  with: VM.WithKeyword;
  yield: void; // the `yield` keyword is implemented directly in @glint/transform
}

export interface Globals extends Keywords {
  // GlimmerX, by design, doesn't have any global values beyond
  // glimmer-vm keywords
}

export declare const Globals: Globals;
