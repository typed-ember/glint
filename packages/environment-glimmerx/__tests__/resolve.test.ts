import { expectTypeOf } from 'expect-type';
import { resolve, resolveOrReturn } from '@glint/environment-glimmerx/-private/dsl';
import { EmptyObject } from '@glint/template/-private/integration';

{
  const shout = (arg: string): string => arg.toUpperCase();

  expectTypeOf(resolve(shout)).toEqualTypeOf<(named: EmptyObject, arg: string) => string>();
  expectTypeOf(resolveOrReturn(shout)).toEqualTypeOf<(named: EmptyObject, arg: string) => string>();

  // @ts-expect-error: strings are not resolvable
  resolve('hello');
  expectTypeOf(resolveOrReturn('hello')).toEqualTypeOf<(named: EmptyObject) => string>();
}
