import { ComponentKeyword } from '@glint/environment-ember-loose/-private/intrinsics/component';
import { Globals as EELGlobals } from '@glint/environment-ember-loose/-private/dsl';

interface Keywords
  extends Pick<
    EELGlobals,
    | 'action'
    | 'debugger'
    | 'each'
    | 'each-in'
    | 'has-block'
    | 'has-block-params'
    | 'if'
    | 'in-element'
    | 'let'
    | 'log'
    | 'mount'
    | 'mut'
    | 'outlet'
    | 'unbound'
    | 'unless'
    | 'with'
    | 'yield'
  > {
  component: ComponentKeyword<{}>;
}

export interface Globals extends Keywords {}

export const Globals: Globals;
