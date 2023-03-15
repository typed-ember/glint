import { ComponentKeyword } from '@glint/environment-ember-loose/-private/dsl';
import { Globals as EELGlobals } from '@glint/environment-ember-loose/-private/dsl';
import Globals from '../../globals';

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


export const Globals: Keywords & Globals;
