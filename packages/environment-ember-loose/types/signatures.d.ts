import '@glimmer/component';
import '@ember/component';
import '@ember/component/helper';
import { ModifierArgs } from 'ember-modifier';

import { NoYields, NoNamedArgs, CreatesModifier } from '@glint/template/-private';
import { ContextType, Invoke } from '@glint/template/-private';
import { TemplateContext, AcceptsBlocks } from '@glint/template/-private';
import { Invokable } from '@glint/template/-private/resolution';

declare module '@glimmer/component' {
  export default interface Component<Args, Yields = NoYields> {
    [Invoke]: (args: Args) => AcceptsBlocks<Yields>;
    [ContextType]: TemplateContext<this, Args, Yields>;
  }
}

declare module '@ember/component' {
  export default interface Component<Args = NoNamedArgs, Yields = NoYields> {
    [Invoke]: (args: Args) => AcceptsBlocks<Yields>;
    [ContextType]: TemplateContext<this, Args, Yields>;
  }
}

declare module '@ember/component/helper' {
  export default interface Helper<
    Positional extends unknown[] = [],
    Named = NoNamedArgs,
    Return = unknown
  > {
    compute(params: Positional, hash: Named): Return;
    [Invoke]: (named: Named, ...positional: Positional) => Return;
  }

  export function helper<Positional extends unknown[] = [], Named = NoNamedArgs, Return = unknown>(
    fn: (params: Positional, hash: Named) => Return
  ): new () => Invokable<(named: Named, ...positional: Positional) => Return>;
}

declare module 'ember-modifier' {
  export default interface ClassBasedModifier<Args extends ModifierArgs = ModifierArgs> {
    [Invoke]: (args: Args['named'], ...positional: Args['positional']) => CreatesModifier;
  }

  export function modifier<
    El extends Element,
    Positional extends unknown[] = [],
    Named = NoNamedArgs
  >(
    fn: (element: El, positional: Positional, named: Named) => unknown
  ): new () => Invokable<(named: Named, ...positional: Positional) => CreatesModifier>;
}
