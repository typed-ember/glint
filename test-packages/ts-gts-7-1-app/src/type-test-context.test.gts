import { typeTest } from '@glint/type-test';

// Regression guard for https://github.com/typed-ember/glint/issues/1186
//
// `typeTest(context, template)` assigns the given context as the template's
// `this` type: the expected type of the `<template>` argument contextually
// types the `Context` of the emitted `templateExpression(...)` call, so
// `{{this.*}}` paths (emitted as `__glintRef__.this.*`) see the context type.
// Glint 1.8.7 briefly emitted the module's lexical `this` (type `undefined`)
// for module-scope expression templates instead, which severed that link and
// broke every context-driven type test with `Object is possibly 'undefined'`.
typeTest(
  {
    int: undefined as unknown as number,
    message: 'hello',
  },
  <template>
    {{@expectTypeOf this.int @to.beNumber}}
    {{@expectTypeOf this.message @to.beString}}

    {{! @glint-expect-error: no such property on the given context }}
    {{@expectTypeOf this.missing @to.beAny}}
  </template>,
);

// The context-less overload types `this` as `null`.
typeTest(
  <template>
    {{@expectTypeOf this @to.beNull}}
  </template>,
);
