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
