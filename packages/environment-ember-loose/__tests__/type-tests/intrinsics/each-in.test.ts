import { expectTypeOf } from 'expect-type';
import {
  emitComponent,
  Globals,
  NamedArgsMarker,
  resolve,
} from '@glint/environment-ember-loose/-private/dsl';

let eachIn = resolve(Globals['each-in']);

{
  const component = emitComponent(eachIn({ a: 5, b: 3 }));

  {
    const [key, value] = component.blockParams.default;
    expectTypeOf(key).toEqualTypeOf<'a' | 'b'>();
    expectTypeOf(value).toEqualTypeOf<number>();
  }
}

// Only gives string keys

{
  const b: unique symbol = Symbol('b');
  const value = { a: 'hi', [b]: 123 };
  const component = emitComponent(eachIn(value));

  {
    const [key, value] = component.blockParams.default;

    // {{each-in}} internally uses `Object.keys`, so only string keys are included
    expectTypeOf(key).toEqualTypeOf<'a'>();
    expectTypeOf(value).toEqualTypeOf<string>();
  }
}

// Can render maybe undefined

declare const maybeVal: { a: number; b: number } | undefined;

{
  const component = emitComponent(eachIn(maybeVal));

  {
    const [key, value] = component.blockParams.default;
    expectTypeOf(key).toEqualTypeOf<'a' | 'b'>();
    expectTypeOf(value).toEqualTypeOf<number>();
  }

  {
    const [...args] = component.blockParams.else;
    expectTypeOf(args).toEqualTypeOf<[]>();
  }
}

// Can render else when undefined, null, or empty.

{
  const component = emitComponent(eachIn(undefined));

  {
    const [key, value] = component.blockParams.default;
    // This won't get called when no value, but gets default key type
    expectTypeOf(key).toEqualTypeOf<string>();
    expectTypeOf(value).toEqualTypeOf<never>();
  }

  {
    const [...args] = component.blockParams.else;
    expectTypeOf(args).toEqualTypeOf<[]>();
  }
}

{
  const component = emitComponent(eachIn(null));

  {
    const [key, value] = component.blockParams.default;
    // This won't get called when no value, but gets default key type
    expectTypeOf(key).toEqualTypeOf<string>();
    expectTypeOf(value).toEqualTypeOf<never>();
  }

  {
    const [...args] = component.blockParams.else;
    expectTypeOf(args).toEqualTypeOf<[]>();
  }
}

{
  const component = emitComponent(eachIn({}));

  {
    const [key, value] = component.blockParams.default;
    // This won't get called when no value
    expectTypeOf(key).toEqualTypeOf<never>();
    expectTypeOf(value).toEqualTypeOf<never>();
  }

  {
    const [...args] = component.blockParams.else;
    expectTypeOf(args).toEqualTypeOf<[]>();
  }
}

// Accept a `key` string
{
  const component = emitComponent(eachIn({ a: 5, b: 3 }, { key: 'id', ...NamedArgsMarker }));

  {
    const [key, value] = component.blockParams.default;
    expectTypeOf(key).toEqualTypeOf<'a' | 'b'>();
    expectTypeOf(value).toEqualTypeOf<number>();
  }
}
