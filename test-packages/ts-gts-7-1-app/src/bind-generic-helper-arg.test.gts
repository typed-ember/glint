import Component from '@glimmer/component';
import type { ComponentLike, ModifierLike, WithBoundArgs } from '@glint/template';
import { expectTypeOf, to } from '@glint/type-test';

// Regression guard for https://github.com/typed-ember/glint/pull/1249
//
// `{{component}}`/`{{helper}}`/`{{modifier}}` with named args emit a comma
// pair (#1068): a keyword call that validates the args, and a `bindInvokable`
// call whose result is the curried value.
// `bindInvokable` only uses the named args' keys,
// so the transform emits a placeholder for their values.
//
// A real value there can collapse the curried value's type.
// Take a call to a generic function that returns a function,
// like ember-set-helper's `(set this "el")`.
// TypeScript skips that call during `bindInvokable`'s first inference pass
// (`SkipGenericFunctions`) and loses its type parameters.
// The curried value then collapses to `Invokable<(...args: unknown[]) => unknown>`.
// Yielded against `WithBoundArgs`, `Args` is inferred from the expected type instead,
// and valid code is rejected.

// Same shape as ember-set-helper's `set`.
declare function setter<T extends object, K extends keyof T & string>(
  target: T,
  path: K,
): (value?: unknown) => T[K];

declare const myModifier: ModifierLike<{
  Args: { Named: { onCreate: (element: HTMLElement) => void } };
  Element: HTMLElement;
}>;

declare const MyComponent: ComponentLike<{
  Args: { onCreate: (element: HTMLElement) => void; label: string };
}>;

// A generic helper inside `(modifier)`, yielded against `WithBoundArgs`.
export class YieldModifier extends Component<{
  Blocks: { default: [WithBoundArgs<typeof myModifier, 'onCreate'>] };
}> {
  el: HTMLElement | null = null;
  <template>{{yield (modifier myModifier onCreate=(setter this "el"))}}</template>
}

// The same through `{{component}}`, with only some args bound.
export class YieldComponent extends Component<{
  Blocks: { default: [WithBoundArgs<typeof MyComponent, 'onCreate'>] };
}> {
  el: HTMLElement | null = null;
  <template>{{yield (component MyComponent onCreate=(setter this "el"))}}</template>
}

declare const boundModifier: WithBoundArgs<typeof myModifier, 'onCreate'>;

// The same bind consumed via `{{#let}}`.
// A collapsed value would accept anything here,
// so this checks that `m` keeps the modifier's type.
export class LetModifier extends Component {
  el: HTMLElement | null = null;
  <template>
    {{#let (modifier myModifier onCreate=(setter this "el")) as |m|}}
      {{expectTypeOf m to.beAssignableToTypeOf boundModifier}}
      <div {{m}}></div>
    {{/let}}
  </template>
}

// A non-generic function in the same position.
export class YieldNonGeneric extends Component<{
  Blocks: { default: [WithBoundArgs<typeof myModifier, 'onCreate'>] };
}> {
  onCreate = (_: HTMLElement): void => {};
  <template>{{yield (modifier myModifier onCreate=this.onCreate)}}</template>
}

// A generic helper whose result doesn't fit the arg is still rejected.
export class Mismatched extends Component<{
  Blocks: { default: [WithBoundArgs<typeof MyComponent, 'label'>] };
}> {
  el: HTMLElement | null = null;
  <template>
    {{! @glint-expect-error }}
    {{yield (component MyComponent label=(setter this "el"))}}
  </template>
}
