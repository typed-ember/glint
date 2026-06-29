import { expectTypeOf, to } from '@glint/type-test';

// This project maps `and`/`or`/`not`/`eq`/`neq` to the `&&`/`||`/`!`/`===`/`!==`
// operator special forms via `glint.additionalSpecialForms` in tsconfig.json.
// Because they compile to the native operators (rather than a boolean-returning
// helper call), TypeScript's control-flow analysis can narrow their operands
// inside `{{#if}}` — exactly the behavior reported missing in
// https://github.com/typed-ember/glint/issues/1169.
//
// `expectTypeOf <value> to.<expectation>` asserts the *exact* type at that
// point in the template. `to.be*` uses strict equality, so each assertion only
// type-checks because the narrowing it describes actually happened.

function isNumber(x: unknown): x is number {
  return typeof x === 'number';
}

// Object members of a union; objects are always truthy, so `{{#if}}` can narrow
// them to exactly `undefined` in the negative branch.
type User = { kind: 'user'; name: string };
type Admin = { kind: 'admin'; level: number };
const user = { kind: 'user', name: 'a' } as User;
const admin = { kind: 'admin', level: 1 } as Admin;
const maybeUser = undefined as User | undefined;
const maybeAdmin = undefined as Admin | undefined;

// `unknown` properties refined only by an explicit type guard.
type Box = { x: unknown; y: unknown };
const box = { x: 1, y: 2 } as Box;

// Discriminated union with a string-literal discriminant, for eq/neq narrowing.
type Circle = { kind: 'circle'; radius: number };
type Square = { kind: 'square'; side: number };
const shape = { kind: 'circle', radius: 1 } as Circle | Square;
const circle = { kind: 'circle', radius: 1 } as Circle;
const square = { kind: 'square', side: 1 } as Square;

<template>
  {{! ===== `and` (&&) ===== }}

  {{! ---- (1) the issue #1169 scenario: each type-guard operand narrows in the
      truthy branch, so both `box.x` and `box.y` refine to `number`. ---- }}
  {{#if (and (isNumber box.x) (isNumber box.y))}}
    {{expectTypeOf box.x to.beNumber}}
    {{expectTypeOf box.y to.beNumber}}
  {{/if}}

  {{! ---- (2) truthiness narrowing: optional objects are excluded of their
      `undefined` member in the truthy branch. ---- }}
  {{#if (and maybeUser maybeAdmin)}}
    {{expectTypeOf maybeUser to.equalTypeOf user}}
    {{expectTypeOf maybeAdmin to.equalTypeOf admin}}
  {{/if}}

  {{! ===== `or` (||) ===== }}

  {{! ---- the else branch narrows *every* operand to its falsy member; for
      object unions that is exactly `undefined`. ---- }}
  {{#if (or maybeUser maybeAdmin)}}
    {{! truthy branch: either operand may be the set one, so neither narrows }}
  {{else}}
    {{expectTypeOf maybeUser to.beUndefined}}
    {{expectTypeOf maybeAdmin to.beUndefined}}
  {{/if}}

  {{! ===== `not` (!) ===== }}

  {{! ---- negation flips the branches: the truthy-negation branch keeps the
      falsy members and the else branch keeps the truthy ones. For an optional
      object the else branch narrows to exactly the object type. ---- }}
  {{#if (not maybeUser)}}
    {{expectTypeOf maybeUser to.beUndefined}}
  {{else}}
    {{expectTypeOf maybeUser to.equalTypeOf user}}
  {{/if}}

  {{! ===== `eq` / `neq` (=== / !==) ===== }}

  {{! ---- `eq` narrows the *parent* discriminated union on a string-literal
      discriminant — something a boolean-returning helper cannot do. ---- }}
  {{#if (eq shape.kind "circle")}}
    {{expectTypeOf shape to.equalTypeOf circle}}
    {{expectTypeOf shape.radius to.beNumber}}
  {{else}}
    {{expectTypeOf shape to.equalTypeOf square}}
  {{/if}}

  {{! ---- `neq` narrows the opposite direction. ---- }}
  {{#if (neq shape.kind "circle")}}
    {{expectTypeOf shape to.equalTypeOf square}}
  {{else}}
    {{expectTypeOf shape to.equalTypeOf circle}}
  {{/if}}

  {{! ===== combined: `and` of an `eq` discriminant and a type guard ===== }}

  {{! ---- both the discriminated union and the `unknown` property narrow
      together inside the one block. ---- }}
  {{#if (and (eq shape.kind "circle") (isNumber box.x))}}
    {{expectTypeOf shape to.equalTypeOf circle}}
    {{expectTypeOf box.x to.beNumber}}
  {{/if}}
</template>
