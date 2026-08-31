import { expectTypeOf } from 'expect-type';
import { NamedArgsMarker, resolve } from '../-private/dsl';
import { ComponentLike, HelperLike, ModifierLike, NoArgs } from '../-private/index';
import { ModifierReturn, NamedArgs } from '../-private/integration';

declare function value<T>(): T;

// ComponentLike
{
  const component = resolve(value<ComponentLike<{ Args: NoArgs }>>());

  expectTypeOf(component).parameters.toEqualTypeOf<[named?: NamedArgs<Record<string, never>>]>();

  component();
  component({ ...NamedArgsMarker });
  component(
    // @ts-expect-error: no named args are accepted
    { anything: true, ...NamedArgsMarker },
  );
  component(
    // @ts-expect-error: no positional args are accepted
    'oops',
  );

  // The `Args: NoArgs` and shorthand `Args: Record<string, never>` spellings
  // normalize identically.
  expectTypeOf(value<ComponentLike<{ Args: Record<string, never> }>>()).toEqualTypeOf<
    ComponentLike<{ Args: NoArgs }>
  >();
}

// HelperLike
{
  const helper = resolve(value<HelperLike<{ Args: NoArgs; Return: string }>>());

  expectTypeOf(helper).toEqualTypeOf<(named?: NamedArgs<Record<string, never>>) => string>();
  expectTypeOf(helper()).toEqualTypeOf<string>();

  helper({ ...NamedArgsMarker });
  helper(
    // @ts-expect-error: no named args are accepted
    { anything: true, ...NamedArgsMarker },
  );
  helper(
    // @ts-expect-error: no positional args are accepted
    'oops',
  );
}

// ModifierLike
{
  const modifier = resolve(value<ModifierLike<{ Args: NoArgs; Element: HTMLCanvasElement }>>());

  expectTypeOf(modifier).toEqualTypeOf<
    (element: HTMLCanvasElement, named?: NamedArgs<Record<string, never>>) => ModifierReturn
  >();

  modifier(value<HTMLCanvasElement>());
  modifier(value<HTMLCanvasElement>(), { ...NamedArgsMarker });
  modifier(
    value<HTMLCanvasElement>(),
    // @ts-expect-error: no named args are accepted
    { anything: true, ...NamedArgsMarker },
  );
  modifier(
    value<HTMLCanvasElement>(),
    // @ts-expect-error: no positional args are accepted
    'oops',
  );
}
