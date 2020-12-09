import * as VM from '@glint/template/-private/keywords';
import { ActionKeyword } from './intrinsics/action';
import { EachInKeyword } from './intrinsics/each-in';
import { LinkToKeyword, LinkToComponent } from './intrinsics/link-to';
import { LogKeyword } from './intrinsics/log';
import Registry from './registry';

// The keyword vs global breakdown here is loosely matched with
// the listing in http://emberjs.github.io/rfcs/0496-handlebars-strict-mode.html

interface Keywords {
  action: ActionKeyword;
  component: VM.ComponentKeyword;
  debugger: VM.DebuggerKeyword;
  each: VM.EachKeyword;
  'each-in': EachInKeyword;
  hasBlock: VM.HasBlockKeyword;
  'has-block': VM.HasBlockKeyword;
  'has-block-params': VM.HasBlockParamsKeyword;
  // the `if` keyword is implemented directly in @glint/transform
  'in-element': VM.InElementKeyword;
  let: VM.LetKeyword;
  'link-to': LinkToKeyword;
  log: LogKeyword;
  mount: void; // TODO
  mut: void; // TODO
  outlet: void; // TODO
  'query-params': void; // TODO
  readonly: void; // TODO
  unbound: void; // TODO
  unless: void; // TODO: should this be implemented as `if (!...)`?
  with: VM.WithKeyword;
  // the `yield` keyword is implemented directly in @glint/transform
}

export interface Globals extends Keywords, Registry {
  // `array` is implemented directly in @glint/transform
  concat: void; // TODO
  fn: void; // TODO
  get: void; // TODO
  // `hash` is implemented directly in @glint/transform
  on: void; // TODO
  input: void; // TODO
  Input: void; // TODO
  LinkTo: LinkToComponent;
  textarea: void; // TODO
  TextArea: void; // TODO
}

export declare const Globals: Globals;
