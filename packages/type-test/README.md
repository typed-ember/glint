# `@glint/type-test`

This library contains template helpers for testing inferred types in Glint-enabled templates.
It's similar in concept to (and built on) the [`expect-type`][et] library.

[et]: https://github.com/mmkal/expect-type

## Usage

```handlebars
{{expectTypeOf "hello" to.beString}}
{{expectTypeOf 123 to.equalTypeOf 456}}
```

### Strict-Mode Templates

For strict-mode templates, the `expectTypeOf` helper and `to` collection of expectations are
both directly importable from `@glint/type-test`.

```gts
import { expectTypeOf, to } from '@glint/type-test';

let letters = ['a', 'b', 'c'];

<template>
  {{#each letters as |letter index|}}
    {{expectTypeOf letter to.beString}}
    {{expectTypeOf index to.beNumber}}
  {{/each}}
<template>
```

### Loose-Mode Templates

For "classic" loose-mode Ember templates, `@glint/type-test` provides a `typeTest` wrapper that
will pass `expectTypeOf` and `to` to your template as args:

```ts
import { typeTest } from '@glint/type-test';
import { hbs } from 'ember-cli-htmlbars';

typeTest(
  hbs`
    {{#each (array 'a' 'b' 'c') as |letter index|}}
      {{@expectTypeOf letter @to.beString}}
      {{@expectTypeOf index @to.beNumber}}
    {{/each}}
  `
);
```

You can also optionally provide an initial `this` value to `typeTest` to make values available
in your template to either test inference against or to use as a basis for comparing type equality.

```ts
import { typeTest } from '@glint/type-test';
import { hbs } from 'ember-cli-htmlbars';

typeTest(
  { letters: ['a', 'b', 'c'] },
  hbs`
    {{#each this.letters as |letter index|}}
      {{@expectTypeOf letter @to.beString}}
      {{@expectTypeOf index @to.beNumber}}
    {{/each}}
  `
);
```

### Expectations

This library provides a set of expectations to compare the type of a given value to common simple
types.

```gts
import { expectTypeOf, to } from '@glint/type-test';

let symbolValue = Symbol('hi');
let anyValue: any = null;
let unknownValue: unknown = null;
let neverValue: never = (null as never);

<template>
  {{expectTypeOf "hello" to.beString}}
  {{expectTypeOf 123 to.beNumber}}
  {{expectTypeOf true to.beBoolean}}
  {{expectTypeOf symbolValue to.beSymbol}}
  {{expectTypeOf anyValue to.beAny}}
  {{expectTypeOf unknownValue to.beUnknown}}
  {{expectTypeOf neverValue to.beNever}}
  {{expectTypeOf null to.beNull}}
  {{expectTypeOf undefined to.beUndefined}}
</template>
```

It also provides expectations that allow you to compare the type of one value to that of another.

```gts
import { expectTypeOf, to } from '@glint/type-test';

let a: 'a' | 'b' = 'a';
let b: 'a' | 'b' = 'b';
let hi: string = 'hi';

<template>
  <!-- 'a' | 'b' is the same type as itself -->
  {{expectTypeOf a to.equalTypeOf b}}
  <!-- 'a' | 'b' is assignable to the more general type string -->
  {{expectTypeOf a to.beAssignableToTypeOf hi}}

  <!-- string is not the same type as 'a' | 'b' -->
  {{! @glint-expect-error }}
  {{expectTypeOf hi to.equalTypeOf a}}

  <!-- string is not assignable to 'a' | 'b' -->
  {{! @glint-expect-error }}
  {{expectTypeOf hi to.beAssignableToTypeOf a}}
</template>
```
