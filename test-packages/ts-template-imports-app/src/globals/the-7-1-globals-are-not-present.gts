import { expectTypeOf, to } from '@glint/type-test';

<template>
  {{! these must not exist prior to 7.1 }}
  {{expectTypeOf on to.beNever}}
  {{expectTypeOf fn to.beNever}}
  {{expectTypeOf array to.beNever}}
  {{expectTypeOf hash to.beNever}}

  {{expectTypeOf and to.beNever}}
  {{expectTypeOf or to.beNever}}
  {{expectTypeOf not to.beNever}}

  {{expectTypeOf eq to.beNever}}
  {{expectTypeOf neq to.beNever}}
  {{expectTypeOf gt to.beNever}}
  {{expectTypeOf lt to.beNever}}
  {{expectTypeOf gte to.beNever}}
  {{expectTypeOf lte to.beNever}}

  {{expectTypeOf element to.beNever}}
</template>
