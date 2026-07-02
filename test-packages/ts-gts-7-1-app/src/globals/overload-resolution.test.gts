import { hash as emberHash } from '@ember/helper';
import { expectTypeOf, to } from '@glint/type-test';
import { expectTypeOf as tsExpectTypeOf } from 'expect-type';
import { noop, Globals } from '@glint/ember-tsc/-private/dsl';

// Regression guard for https://github.com/typed-ember/glint/issues/1180
// An overloaded function invoked from a template must resolve to the same
// overload plain TypeScript would pick for an inline object literal. The
// keyword `hash` therefore emits as an object-literal special form (like the
// `@ember/helper` import), keeping the literal fresh. Emitting it as a helper
// call instead loses freshness, and TypeScript's overload resolution rejects a
// non-fresh argument that omits an optional property during its subtype pass —
// so `{{x "A" (hash a=1)}}` picked the catch-all overload, whose `object`
// return type is not renderable as content.
declare function x(
  type: 'A',
  value: { readonly a: number; readonly b?: string | undefined },
): number;
declare function x(type: string, value?: object): object;

// Plain TypeScript picks the first overload for inline (fresh) object
// literals, with or without the optional `b`.
tsExpectTypeOf(x('A', { a: 1 })).toEqualTypeOf<number>();
tsExpectTypeOf(x('A', { a: 1, b: '2' })).toEqualTypeOf<number>();

// The same invocations as glint emits them for the `hash` keyword: a discarded
// reference to the keyword (for hover docs), then a fresh object literal.
tsExpectTypeOf(x('A', (noop(Globals.hash), { a: 1 }))).toEqualTypeOf<number>();
tsExpectTypeOf(x('A', (noop(Globals.hash), { a: 1, b: '2' }))).toEqualTypeOf<number>();

<template>
  {{x "A" (hash a=1)}}
  {{x "A" (hash a=1 b="2")}}
  {{x "A" (emberHash a=1)}}
  {{x "A" (emberHash a=1 b="2")}}

  {{expectTypeOf (x "A" (hash a=1)) to.beNumber}}
  {{expectTypeOf (x "A" (emberHash a=1)) to.beNumber}}
</template>
