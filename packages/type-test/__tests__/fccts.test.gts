import { expectTypeOf, to } from '@glint/type-test';

let exemplars = {
  string: 'foo',
  number: 123,
  boolean: true,
  symbol: Symbol(),
  any: null as any,
  unknown: null as unknown,
  never: null as never,
  null_: null,
  undefined_: undefined,
  hello: 'hello' as const
};

<template>
  {{expectTypeOf exemplars.string to.beString}}
  {{expectTypeOf exemplars.number to.beNumber}}
  {{expectTypeOf exemplars.boolean to.beBoolean}}
  {{expectTypeOf exemplars.symbol to.beSymbol}}
  {{expectTypeOf exemplars.any to.beAny}}
  {{expectTypeOf exemplars.unknown to.beUnknown}}
  {{expectTypeOf exemplars.never to.beNever}}
  {{expectTypeOf exemplars.null_ to.beNull}}
  {{expectTypeOf exemplars.undefined_ to.beUndefined}}
  {{expectTypeOf exemplars.hello to.equalTypeOf exemplars.hello}}
  
  {{expectTypeOf 123 to.equalTypeOf 456}}
  {{! @glint-expect-error: different types }}
  {{expectTypeOf 123 to.equalTypeOf 'hi'}}

  {{expectTypeOf exemplars.hello to.beAssignableToTypeOf exemplars.hello}}
  {{expectTypeOf exemplars.hello to.beAssignableToTypeOf exemplars.string}}
  {{! @glint-expect-error: string is not assignable to 'hello' }}
  {{expectTypeOf exemplars.string to.beAssignableToTypeOf exemplars.hello}}
</template>
