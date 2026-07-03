import Component from '@glimmer/component';
import { expectTypeOf, to } from '@glint/type-test';

// Regression guard for https://github.com/typed-ember/glint/issues/1182
// A `<template>` in expression position (RFC 931 implicit form) inside a class
// member captures the lexical `this` of its position, the way an arrow
// function does. In a class field initializer that's the enclosing instance,
// so `{{this.index}}` inside `X` refers to MyComponent's `index`. Glint used
// to emit these as if they were the class's own template
// (`templateForBackingValue(this, ...)`), which broke context inference in
// field position and silently typed the template's `this` as `any`.
export default class MyComponent extends Component {
  private readonly index = 10;

  private readonly X = <template>
    {{expectTypeOf this.index to.beNumber}}
    {{this.index}}
  </template>;

  <template>
    <this.X />
    {{expectTypeOf this.index to.beNumber}}
  </template>
}

// At module scope there is no meaningful lexical `this`, so an expression
// template's `this` comes from the template context instead: `void` unless a
// consumer assigns one through contextual typing, the way `typeTest` from
// `@glint/type-test` does (#1186). Property access on the unassigned context
// must be an error rather than silently `any`.
export const ModuleScoped = <template>
  {{! @glint-expect-error -- module-scope `this` has no assigned context, so it has no properties }}
  {{this.index}}
</template>;
