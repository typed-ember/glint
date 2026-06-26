import { expectTypeOf, to } from '@glint/type-test';

// `expectTypeOf <value> to.<expectation>` asserts the *exact* type of a value
// at that point in the template. The `to.be*` expectations use strict equality,
// so e.g. `to.beString` only holds if the value is exactly `string` — an
// un-narrowed `string | undefined` fails. Each assertion below therefore only
// type-checks because the narrowing it describes actually happened.

// ---------------------------------------------------------------------------
// (1) Result-type narrowing of the RFC 560 truth keywords.
// ---------------------------------------------------------------------------
const maybeName = undefined as string | undefined;
const nullableName = null as string | null;
const maybeCount = undefined as number | undefined;
const fallback = 'anon' as string;
const fallbackCount = 0 as number;
const truthyObj = {} as object;

// ---------------------------------------------------------------------------
// (2) Control-flow narrowing via `{{#if}}` over plain values and objects.
// ---------------------------------------------------------------------------
type User = { name: string; age: number };
const maybeUser = undefined as User | undefined;

// Optional property: the property itself is `string | undefined`.
type Profile = { nickname?: string };
const profile = {} as Profile;

// Discriminated union whose variants carry *different* properties/types.
type Circle = { isCircle: true; radius: number };
type Square = { isCircle: false; sideLength: number };
const shape = { isCircle: true, radius: 1 } as Circle | Square;
const circle = { isCircle: true, radius: 1 } as Circle;
const square = { isCircle: false, sideLength: 1 } as Square;

// ---------------------------------------------------------------------------
// (3) Control-flow narrowing driven by the `not` keyword. `(not x)` is typed as
// a type predicate over Ember's `Falsy` type, so `{{#if (not x)}}` narrows `x`
// to its falsy members and the `{{else}}` branch to its truthy members — using
// Handlebars truthiness, not JavaScript's.
// ---------------------------------------------------------------------------
const user = { name: 'a', age: 1 } as User;
// Discriminated by Ember's `isTruthy` protocol.
type Loaded = { isTruthy: true; data: string };
type Empty = { isTruthy: false };
const box = { isTruthy: true, data: 'x' } as Loaded | Empty;
const loaded = { isTruthy: true, data: 'x' } as Loaded;
const empty = { isTruthy: false } as Empty;

// ---------------------------------------------------------------------------
// (4) Control-flow narrowing driven by `eq`/`neq`. These compile to native
// `===`/`!==`, so `{{#if (eq foo.x "a")}}` narrows the *parent* discriminated
// union `foo` to the matching variant (something a boolean-returning helper
// cannot do).
// ---------------------------------------------------------------------------
type Foo = { x: 'a'; y: number } | { x: 'b'; y: string };
const foo = { x: 'a', y: 1 } as Foo;
const fooA = { x: 'a', y: 1 } as { x: 'a'; y: number };
const fooB = { x: 'b', y: 's' } as { x: 'b'; y: string };

<template>
  {{! ===== (1) result-type narrowing of or / and ===== }}

  {{! (or) excludes the falsy `undefined` / `null` member once a later operand
      can supply a value. }}
  {{expectTypeOf (or maybeName fallback) to.beString}}
  {{expectTypeOf (or nullableName fallback) to.beString}}
  {{expectTypeOf (or maybeCount fallbackCount) to.beNumber}}

  {{! (and) short-circuits to the trailing operand once the leading operand is
      statically truthy, so the result takes the trailing operand's type. }}
  {{expectTypeOf (and truthyObj fallback) to.beString}}
  {{expectTypeOf (and truthyObj fallbackCount) to.beNumber}}

  {{! ===== (2) control-flow narrowing via {{#if}} ===== }}

  {{! ---- optional value: the guard refines `string | undefined` to `string`.
      (The else branch stays `string | undefined`, since `''` is also falsy and
      cannot be excluded from `string`.) ---- }}
  {{#if maybeName}}
    {{expectTypeOf maybeName to.beString}}
  {{/if}}

  {{! ---- optional object: the guard refines to `User` (read its props); the
      else branch refines to exactly `undefined`, since an object is always
      truthy and is therefore excluded there ---- }}
  {{#if maybeUser}}
    {{expectTypeOf maybeUser.name to.beString}}
    {{expectTypeOf maybeUser.age to.beNumber}}
  {{else}}
    {{expectTypeOf maybeUser to.beUndefined}}
  {{/if}}

  {{! ---- optional property ---- }}
  {{#if profile.nickname}}
    {{expectTypeOf profile.nickname to.beString}}
  {{/if}}

  {{! ---- discriminated union: each branch narrows the whole value to the
      variant that owns the matching discriminant property ---- }}
  {{#if shape.isCircle}}
    {{expectTypeOf shape to.equalTypeOf circle}}
    {{expectTypeOf shape.radius to.beNumber}}
  {{else}}
    {{expectTypeOf shape to.equalTypeOf square}}
    {{expectTypeOf shape.sideLength to.beNumber}}
  {{/if}}

  {{! ===== (3) narrowing driven by the `not` keyword ===== }}

  {{! ---- (not) negates the guard: the truthy-negation branch keeps the falsy
      members and the else branch keeps the truthy ones. For an object union the
      else branch narrows to exactly the object type. ---- }}
  {{#if (not maybeUser)}}
    {{expectTypeOf maybeUser to.beUndefined}}
  {{else}}
    {{expectTypeOf maybeUser to.equalTypeOf user}}
  {{/if}}

  {{! ---- (not) over an `isTruthy`-discriminated union narrows in both
      directions via Handlebars truthiness. ---- }}
  {{#if (not box)}}
    {{expectTypeOf box to.equalTypeOf empty}}
  {{else}}
    {{expectTypeOf box to.equalTypeOf loaded}}
  {{/if}}

  {{! ===== (4) discriminated-union narrowing via eq / neq ===== }}

  {{! ---- (eq) narrows the parent union on a string-literal discriminant ---- }}
  {{#if (eq foo.x "a")}}
    {{expectTypeOf foo to.equalTypeOf fooA}}
    {{expectTypeOf foo.y to.beNumber}}
  {{else}}
    {{expectTypeOf foo to.equalTypeOf fooB}}
    {{expectTypeOf foo.y to.beString}}
  {{/if}}

  {{! ---- (neq) narrows the opposite direction ---- }}
  {{#if (neq foo.x "a")}}
    {{expectTypeOf foo.y to.beString}}
  {{else}}
    {{expectTypeOf foo.y to.beNumber}}
  {{/if}}
</template>
