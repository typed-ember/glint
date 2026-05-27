<template>
  {{! These names must not be present on `Globals` prior to ember-source 7.1.
      Each `@glint-expect-error` below asserts TypeScript reports
      "Cannot find name 'X'", which is the diagnostic that carries the
      auto-import quick-fix (`ember-truth-helpers` / `@ember/helper`) in
      consumer projects on < 7.1. See packages/ember-tsc/types/-private/dsl/globals.d.ts. }}

  {{! @glint-expect-error -- `on` is not a global on ember-source < 7.1 }}
  {{on}}
  {{! @glint-expect-error -- `fn` is not a global on ember-source < 7.1 }}
  {{fn}}
  {{! @glint-expect-error -- `array` is not a global on ember-source < 7.1 }}
  {{array}}
  {{! @glint-expect-error -- `hash` is not a global on ember-source < 7.1 }}
  {{hash}}

  {{! @glint-expect-error -- `and` is not a global on ember-source < 7.1 }}
  {{and}}
  {{! @glint-expect-error -- `or` is not a global on ember-source < 7.1 }}
  {{or}}
  {{! @glint-expect-error -- `not` is not a global on ember-source < 7.1 }}
  {{not}}

  {{! @glint-expect-error -- `eq` is not a global on ember-source < 7.1 }}
  {{eq}}
  {{! @glint-expect-error -- `neq` is not a global on ember-source < 7.1 }}
  {{neq}}
  {{! @glint-expect-error -- `gt` is not a global on ember-source < 7.1 }}
  {{gt}}
  {{! @glint-expect-error -- `lt` is not a global on ember-source < 7.1 }}
  {{lt}}
  {{! @glint-expect-error -- `gte` is not a global on ember-source < 7.1 }}
  {{gte}}
  {{! @glint-expect-error -- `lte` is not a global on ember-source < 7.1 }}
  {{lte}}

  {{! @glint-expect-error -- `element` is not a global on ember-source < 7.1 }}
  {{element}}
</template>
