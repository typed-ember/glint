import { NoNamedArgs, CreatesModifier, NoYields } from '@glint/template/-private';
import { ContextType, Invoke } from '@glint/template/-private';
import { TemplateContext, AcceptsBlocks } from '@glint/template/-private';
import { Invokable } from '@glint/template/-private/resolution';

declare module '@glimmerx/component' {
  export default interface Component<Args, Yields = NoYields> {
    [Invoke]: (args: Args) => AcceptsBlocks<Yields>;
    [ContextType]: TemplateContext<this, Args, Yields>;
  }
}

declare module '@glimmerx/modifier' {
  // TODO: this is really bringing https://github.com/typed-ember/glint/issues/25 to a head
  // We need to stop trying to augment existing types and instead setup re-exports with our
  // own proper types.
  export const on2: Invokable<<Name extends keyof HTMLElementEventMap>(
    args: NoNamedArgs,
    name: Name,
    callback: (event: HTMLElementEventMap[Name]) => void
  ) => CreatesModifier>;
}

declare module '@glimmerx/helper' {
  export function helper<Result, Named = NoNamedArgs, Positional extends unknown[] = []>(
    fn: (positional: Positional, named: Named) => Result
  ): new () => Invokable<(args: Named, ...positional: Positional) => Result>;

  // TODO: this is really bringing https://github.com/typed-ember/glint/issues/25 to a head
  // We need to stop trying to augment existing types and instead setup re-exports with our
  // own proper types.
  export const fn2: Invokable<{
    <Ret, Args extends unknown[]>(args: NoNamedArgs, f: (...rest: Args) => Ret): (
      ...rest: Args
    ) => Ret;
    <A, Ret, Args extends unknown[]>(args: NoNamedArgs, f: (a: A, ...rest: Args) => Ret, a: A): (
      ...rest: Args
    ) => Ret;
    <A, B, Ret, Args extends unknown[]>(
      args: NoNamedArgs,
      f: (a: A, b: B, ...rest: Args) => Ret,
      a: A,
      b: B
    ): (...rest: Args) => Ret;
    <A, B, C, Ret, Args extends unknown[]>(
      args: NoNamedArgs,
      f: (a: A, b: B, c: C, ...rest: Args) => Ret,
      a: A,
      b: B,
      c: C
    ): (...rest: Args) => Ret;
    <A, B, C, D, Ret, Args extends unknown[]>(
      args: NoNamedArgs,
      f: (a: A, b: B, c: C, d: D, ...rest: Args) => Ret,
      a: A,
      b: B,
      c: C,
      d: D
    ): (...rest: Args) => Ret;
  }>;
}
