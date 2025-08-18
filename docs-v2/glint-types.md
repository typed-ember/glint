## `ComponentLike`, `HelperLike` and `ModifierLike`

While we often work in terms of specific implementations of components, helpers and modifiers, when we're using e.g. `MyComponent` in a template, it doesn't matter whether `MyComponent` is a template-only component, or a subclass of `@glimmer/component` or is a completely different object with a [custom component manager](https://github.com/emberjs/rfcs/blob/master/text/0213-custom-components.md).

To account for this, the `@glint/template` package provides a set of more general types: the `ComponentLike`, `HelperLike` and `ModifierLike` types describe _any_ value that is usable as the respective type of entity in a template.

For example, in Ember all of the following values are `ComponentLike`:

 - a subclass of `@glimmer/component`
 - a subclass of `@ember/component`
 - the return value of `templateOnlyComponent()` from `@ember/component/template-only`
 - a `<template>` expression in [a `.gts` file](https://github.com/emberjs/rfcs/blob/master/text/0779-first-class-component-templates.md)
 - the result of a `{{component ...}}` expression in a template

These types each accept signatures in the same format that the base classes for [components](./ember/component-signatures.md) and [helpers/modifiers](./ember/helper-and-modifier-signatures.md) do.

## `WithBoundArgs` and `WithBoundPositionals`

When you yield a "contextual component" (or helper or modifier), you need some way to declare the type of that value in the signature of the yielding component. 

```handlebars
{{yield (hash banner=(component "some-banner" kind="warning"))}}
```

The return value from `{{component}}` component isn't the actual `SomeBanner` class—it won't have e.g. any of `SomeBanner`'s static members, and it also no longer requires a `@kind` arg, since a default value has been set as part of the `(component)` invocation.

We could use `ComponentLike` to describe the type of this value:

```typescript
import { ComponentLike } from '@glint/template';
import { SomeBannerSignature } from './some-banner';

interface MyComponentSignature {
  Blocks: {
    default: [{
      banner: ComponentLike<{
        Element: SomeBannerSignature['Element'];
        Blocks: SomeBannerSignature['Blocks'];
        Args: 
          Omit<SomeBannerSignature['Args'], 'kind'> 
            & { kind?: SomeBannerSignature['Args']['kind'] };
      }>;
    }];
  };
}
```

However, that's quite a lot of boilerplate to essentially express "it's like `SomeBanner` except `kind` is already set". Instead, you can use the `WithBoundArgs` type to express the same thing:

```typescript
import { WithBoundArgs } from '@glint/template';
import SomeBanner from './some-banner';

interface MyComponentSignature {
  Blocks: {
    default: [{
      banner: WithBoundArgs<typeof SomeBanner, 'kind'>;
    }];
  };
}
```

If you had pre-bound multiple named args, you could union them together with the `|` type operator, e.g. `'kind' | 'title'`.

Similarly, when working with a component/helper/modifier where you're pre-binding positional arguments, you can use `WithBoundPositionals` to indicate to downstream consumers that those arguments are already set:

```handlebars
{{yield (hash greetChris=(helper greetHelper "Chris"))}}
```

```typescript
interface MyComponentSignature {
  Blocks: {
    default: [{
      greetChris: WithBoundPositionals<typeof greetHelper, 1>
    }];
  };
}
```

Where `WithBoundArgs` accepts the names of the pre-bound arguments, `WithBoundPositionals` accepts the number of positional arguments that are pre-bound, since binding a positional argument with `{{component}}`/`{{modifier}}`/`{{helper}}` sets that argument in a way that downstream users can't override.

## Advanced Types Usage

From Glint's perspective, what _makes_ a value usable as a component is being typed as a constructor
for a value type that matches the instance type of `ComponentLike`. The same is true of helpers with
`HelperLike` and modifiers with `ModifierLike`.

While this may seem like a negligible detail, making use of this fact can allow authors with a good
handle on TypeScript's type system to pull off some very flexible "tricks" when working with Glint.

### Custom Glint Entities

Ember (and the underlying Glimmer VM) has a notion of _managers_ that allow authors to define custom
values that act as components, helpers or modifiers when used in a template. Glint can't know how
these custom entities will work, but by using `ComponentLike`/`HelperLike`/`ModifierLike`, you can
explain to the typechecker how they function in a template.

For example, if you had a custom DOM-less "fetcher component" base class, you could use TypeScript
[declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) to
tell Glint that its instance type extended `InstanceType<ComponentLike<S>>`, where `S` is an
appropriate component signature based on how your custom component works.

```typescript
// Define the custom component base class
class FetcherComponent<Params, Payload> {
  // ...
}

// Set its manager and, if necessary, template
setComponentManager(/*...*/, FetcherComponent);
setComponentTemplate(/*...*/, FetcherComponent);

// Use declaration merging to declare that the base class acts, from Glint's perspective,
// like a component with the given signature when used in a template.
interface FetcherComponent<Params, Payload> extends InstanceType<
  ComponentLike<{
    Args: { params: Params };
    Blocks: {
      loading: [];
      error: [message: string];
      ready: [payload: Payload];
    };
  }
>> {}
```

This is a fairly contrived example, and in most circumstances it would be simpler to use a standard
base class like `@glimmer/component`, but nevertheless the option exists.

**Note**: this declaration merging technique using `InstanceType<ComponentLike<...>>` is _exactly_
how Glint's own 1st-party environment packages like `@glint/environment-ember-template-imports` set up the
template-aware types for `@glimmer/component`, `@ember/component/helper`, etc.

### Type Parameters

When defining a class-based component, modifier or helper, you have a natural place to introduce
any type parameters you may need. For example:

```typescript
export interface MyEachSignature<T> {
  Args: { items: Array<T> };
  Blocks: {
    default: [item: T, index: number];
  };
}

export class MyEach<T> extends Component<MyEachSignature<T>> {
  // ...
}
```

However, if you aren't working with a concrete base type and can only say that your value is,
for instance, some kind of `ComponentLike`, then TypeScript no longer offers you a place to
introduce a type parameter into scope:

```typescript
// 💥 Syntax error
declare const MyEach<T>: ComponentLike<MyEachSignature<T>>;

// 💥 Cannot find name 'T'. ts(2304)
declare const MyEach: ComponentLike<MyEachSignature<T>>;
```

Since what matters is the _instance_ type, however, it is possible to define `MyEach` using just
`ComponentLike` and slightly more type machinery:

```typescript
declare const MyEach: abstract new <T>() => InstanceType<
  ComponentLike<MyEachSignature<T>>
>;
```

This shouldn't be a tool you frequently find the need to reach for, but it can be useful on
occasion when working with complex declarations.
