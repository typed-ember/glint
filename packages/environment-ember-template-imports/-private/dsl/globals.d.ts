import { Globals as EELGlobals } from '@glint/environment-ember-loose/-private/dsl';
import Globals from '../../globals';

interface Keywords
  extends Pick<
    EELGlobals,
    | 'action'
    | 'component'
    | 'debugger'
    | 'each'
    | 'each-in'
    | 'has-block'
    | 'has-block-params'
    | 'helper'
    | 'if'
    | 'in-element'
    | 'let'
    | 'log'
    | 'modifier'
    | 'mount'
    | 'mut'
    | 'outlet'
    | 'unbound'
    | 'unless'
    | 'with'
    | 'yield'
  > {}

export const Globals: Keywords & Globals;
