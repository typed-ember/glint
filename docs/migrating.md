# Migrating

## Glint 0.9.x to 1.0

{% hint style="warning" %}

Glint 1.0 is currently in a beta period. We encourage you to try out the beta and report any
issues you run into. While we don't anticipate landing any further breaking changes during the beta
cycle, be aware that it's still possible we'll do so in response to bugs or other early feedback.

{% endhint %}

Most of the changes in Glint 1.0 should appear as bugfixes and improvements to the majority of 
users migrating from 0.9.x.

The main change to be aware of is that **`@glint/template` should now be explicitly added to your
project's `devDependencies`** when you upgrade Glint. Note also that support for `include` and
`exclude` globs has been removed.

More details about these and other breaking changes are laid out below.

### `@glint/template` Peer

For Glint to work properly, there must be exactly one common copy of `@glint/template` present
in your dependency hierarchy. This has been true throughout our 0.x releases, but as of 1.0
we're making that explicit by marking `@glint/template` as a `peerDependency` of our environment
packages rather than a hard `dependency`.

Accordingly, you will need to add `@glint/template` to your project's own dependencies list
alongside `@glint/core` and your environment package(s).

Note also that if you publish an addon that depends on types from `@glint/template`, that addon
should likewise declare a `peerDependency` on `@glint/template` and **not** a regular `dependency`.

### `include`/`exclude` Configuration

Glint 1.0 drops support for the `transform` configuration key, which is where `include` and
`exclude` globs were previously specified. These options were a blunt instrument left over from an
earlier iteration of Glint.

If you're currently relying on these keys to have Glint skip typechecking for parts of your
codebase, consider using `@glint-nocheck` directives instead. You can automate the process of
adding those directives to templates that have type errors using the [`glint-auto-nocheck`] script.

Note that templates with a `@glint-nocheck` directive will benefit from best-effort editor support
for features such as hover information, go-to-definition, etc. even if they aren't typesafe,
which is a meaningful advantage over templates that were ignored via `include`/`exclude`.

[`glint-auto-nocheck`]: https://github.com/typed-ember/glint/tree/main/packages/scripts#auto-glint-nocheck

### Tagged Strings in `ember-template-imports`

Since `<template>` [has been been selected][fccts] as the path forward for template imports (a.k.a
strict mode) in Ember, the `hbs` string tag from `ember-template-imports` is no longer treated as
a template marker by `@glint/environment-ember-template-imports`. This also aligns with the intent
to [deprecate `hbs`][eti-no-more-hbs] in `ember-template-imports` itself.

Projects using `ember-template-imports` will need to migrate to `<template>` in order to upgrade to
Glint 1.0, as any remaining `hbs`-tagged templates will be treated as simple strings.

[fccts]: https://rfcs.emberjs.com/id/0779-first-class-component-templates/
[eti-no-more-hbs]: https://github.com/ember-template-imports/ember-template-imports/pull/18#issuecomment-1311185752

### Internal Type Updates

Between 0.9.x and 1.0, several updates landed to rework how Glint internally represents the types
of many template entities. For end users, this should result in simpler error messages, better
support for "plain-function" helpers, and more sensible assignability rules when working with types
like `ComponentLike<...>`.

This change also resulted in Glint (correctly!) flagging some new type errors that might previously
have been missed. One notable case of this is with Ember's `{{on}}` modifier, which in prior
versions would accept a callback that required a more specific `Event` subtype than was actually
appropriate based on the event being listened to.

Finally, note that this change is almost guaranteed to break most usage of private Glint types
from the template layer. If you've been using private APIs in 0.9.x, you'll likely need to update
that usage to be compatible with 1.0.

## Glint 0.8.x to 0.9.x

Glint 0.9 removes support for the `.glintrc.yml` file, moving configuration into your project's `tsconfig.json` or
`jsconfig.json` file under a `"glint"` key instead. It also restructures the format of the configuration slightly.

The changes are noted below, but also check out the [Configuration](configuration.md) guide for full details on
the options you can specify.

### Migrating `environment` and `checkStandaloneTemplates`

The `environment` and `checkStandaloneTemplates` options function exactly as before, and you can translate them directly
from YAML to JSON for use in your `tsconfig`/`jsconfig` file.

{% tabs %}
{% tab title=".glintrc.yml" %}

```yaml
environment:
  - ember-loose
  - ember-template-imports
```

{% endtab %}
{% tab title="tsconfig.json" %}

```javascript
{
  "compilerOptions": { /* ... */ },
  "glint": {
    "environment": ["ember-loose", "ember-template-imports"]
  }
}
```

{% endtab %}
{% endtabs %}

### Migrating `include` and `exclude`

The `include` and `exclude` options are now grouped together under a `transform` key in order to more clearly denote
their distinction from TypeScript's own `include`/`exclude`/`files` options.

{% tabs %}
{% tab title=".glintrc.yml" %}

```yaml
environment: ember-loose
include:
  - 'app/**'
  - 'tests/**'
```

{% endtab %}
{% tab title="tsconfig.json" %}

```javascript
{
  "compilerOptions": { /* ... */ },
  "glint": {
    "environment": "ember-loose",
    "transform": {
      "include": ["app/**", "tests/**"]
    }
  }
}
```

{% endtab %}
{% endtabs %}

{% hint style="info" %}
If you have an `include` array like the one above that effectively encompasses your whole project, you should instead
just drop that configuration and leave the `transform` key out of your configuration entirely.

Glint performs template analysis on all files covered by your `tsconfig` or `jsconfig` by default.
{% endhint %}

## Glint 0.7.x to 0.8.0

Glint 0.8.0 drops support for custom imports from `@glint/environment-ember-loose` for values from `@ember/component`,
`@glimmer/component` and `ember-modifier`. It also only supports usage of the standardized signature formats that have
been adopted in those upstream packages.

To migrate from previous Glint release to 0.8.0, you can first update to the most recent 0.7.x version of Glint and
follow the migration instructions for native signatures and imports below, either incrementally or all at once.

When you've finished your migration, you can update to Glint 0.8 and remove the
`import '@glint/environment-ember-loose/native-integration';` line from your project, leaving only
`import '@glint/environment-ember-loose';`.

{% hint style="warning" %}
Note: `@glint/environment-glimmerx` currently does not support native imports and has been held back temporarily from
release for version 0.8.0. Until a new release of GlimmerX is available, please remain on Glint 0.7 for projects using
GlimmerX.
{% endhint %}

## Native Signatures and Imports

This guide provides direction for migrating from custom Glint-specific import paths and signature formats to the
native imports and standardized signatures for `@ember/component`, `@glimmer/component` and `ember-modifier`.

Note that this guide applies to `@glint/environment-ember-loose`, but `@glint/environment-glimmerx` doesn't yet support
native imports, pending an upgrade of GlimmerX's own dependencies.

### Background

Prior to version `0.7.4`, Glint required users to import the factories and base classes for components, helpers and
modifiers from custom environment-specific paths. This was because the "native" versions of those entities couldn't
capture enough information for Glint to typecheck them in a template with reasonable fidelity.

Consider `@glimmer/component` as an example.

```typescript
import Component from '@glimmer/component';

export interface MyComponentArgs {
  message: string;
}

export default class MyComponent extends Component<MyComponentArgs> {
  // ...
}
```

Knowing only about the `MyComponent`'s expected `@arg` values, Glint couldn't provide any validation or assistance
for what blocks the component accepts, what parameters it yields to those blocks, or what kind of modifiers would
be valid to apply to it.

### Signatures

Ember RFC [#748](https://github.com/emberjs/rfcs/pull/748) formalized a notion of "component signatures" based on
exploratory work Glint had done to find ways of expression the type information that `Args` alone couldn't capture.

The `@glimmer/component` package, as well as `ember-modifier` and `@types/ember__component` have been updated based on
the results of that RFC, and starting with version `0.7.4` of Glint, users may opt into using the regular import paths
and standardized signature formats those packages have adopted.

### Opting into Native Integration

In order to opt into Glint's augmentation of the native component, modifier and helper imports, add the following import
somewhere in your project (likely below wherever you have `import '@glint/environment-ember-loose'`):

```typescript
import '@glint/environment-ember-loose/native-integration';
```

In version `0.8.0`, integration will be enabled by default and this extra import will be unnecessary.

### New Signature Formats

As you move each component, modifier and helper in your project from the `environment-ember-loose` import path to the
native one, you'll also need to update its signature to the standardized format. You can make this migration
incrementally or all at once, depending on the size of your project.

#### Components

For components, there are two key changes (see [the relevant section](https://github.com/dfreeman/ember-rfcs/blob/glimmer-component-signature/text/0748-glimmer-component-signature.md#invokablecomponentsignature) in the RFC):

- `Yields` has become `Blocks`. This key has a more complex notional desugaring, but the shorthand is compatible with
  how `Yields` worked before.
- `Args` and `PositionalArgs` have been merged into `Args: { Named: ...; Positional: ... }`. If your component only has
  named args (which is true for all Glimmer components and most Ember components), the wrapping layer can be skipped
  and you can continue to use `Args: MyNamedArgs` as before.

{% tabs %}
{% tab title="Glimmer Component Before" %}

```typescript
import Component from '@glint/environment-ember-loose/glimmer-component';

export interface MyComponentSignature {
  Args: { message: string };
  Yields: { default: [] };
  Element: HTMLDivElement;
}

export default class MyComponent extends Component<MyComponentSignature> {
  // ...
}
```

{% endtab %}
{% tab title="Glimmer Component After" %}

```typescript
import Component from '@glimmer/component';

export interface MyComponentSignature {
  Args: { message: string };
  Blocks: { default: [] };
  Element: HTMLDivElement;
}

export default class MyComponent extends Component<MyComponentSignature> {
  // ...
}
```

{% endtab %}
{% endtabs %}

Template only components should now be imported directly from `@ember/component/template-only` instead of from
`@glint/environment-ember-loose/ember-component/template-only`.

Note that for `EmberComponent` subclasses, there is no native `ArgsFor` equivalent, and the `ArgsFor` helper type will
be removed in Glint `0.8.0` along with the rest of the `@glint/envrionment-ember-loose/ember-component` module.

You can instead define your named args in a dedicated type declaration, or write a simple `ArgsFor` helper for your own
project if you wish.

{% tabs %}
{% tab title="Ember Component Before" %}

```typescript
import Component, { ArgsFor } from '@glint/environment-ember-loose/ember-component';

export interface MyComponentSignature {
  Args: { count?: number };
  PositionalArgs: [message: string];
}

export default interface MyComponent extends ArgsFor<MyComponentSignature> {}
export default class MyComponent extends Component<MyComponentSignature> {
  // ...
}
```

{% endtab %}
{% tab title="Ember Component After" %}

```typescript
import Component from '@ember/component';

export interface MyComponentNamedArgs {
  count?: number;
}

export interface MyComponentSignature {
  Args: {
    Named: MyComponentNamedArgs;
    Positional: [message: string];
  };
}

export default interface MyComponent extends MyComponentNamedArgs {}
export default class MyComponent extends Component<MyComponentSignature> {
  // ...
}
```

{% endtab %}
{% endtabs %}

#### Helpers

For helpers, `NamedArgs` and `PositionalArgs` have been merged into `Args: { Named: ...; Positional: ... }`, similar to
the change for components. Unlike components, however, since neither type of argument is privileged over the other in
the way helpers are defined today, there is no shorthand.

{% tabs %}
{% tab title="Helper Before" %}

```typescript
import Helper from '@glint/environment-ember-loose/ember-component/helper';

export interface MyHelperSignature {
  PositionalArgs: [message: string];
  NamedArgs: { count?: number };
  Return: Array<string>;
}

export default class MyHelper extends Helper<MyHelperSignature> {
  // ...
}
```

{% endtab %}
{% tab title="Helper After" %}

```typescript
import Helper from '@ember/component/helper';

export interface MyHelperSignature {
  Args: {
    Positional: [message: string];
    Named: { count?: number };
  };
  Return: Array<string>;
}

export default class MyHelper extends Helper<MyHelperSignature> {
  // ...
}
```

{% endtab %}
{% endtabs %}

#### Modifiers

Modifier signatures have undergone the same revision as helper signatures. `NamedArgs` and `PositionalArgs` have been
merged into `Args: { Named: ...; Positional: ... }`, and similarly there is no shorthand for modifiers that have only
named or only positional args.

{% tabs %}
{% tab title="Modifier Before" %}

```typescript
import Modifier from '@glint/environment-ember-loose/ember-modifier';

export interface MyModifierSignature {
  PositionalArgs: [message: string];
  NamedArgs: { count?: number };
  Element: HTMLCanvasElement;
}

export default class MyModifier extends Modifier<MyModifierSignature> {
  // ...
}
```

{% endtab %}
{% tab title="Modifier After" %}

```typescript
import Modifier from 'ember-modifier';

export interface MyModifierSignature {
  Args: {
    Positional: [message: string];
    Named: { count?: number };
  };
  Element: HTMLCanvasElement;
}

export default class MyModifier extends Modifier<MyModifierSignature> {
  // ...
}
```

{% endtab %}
{% endtabs %}

#### Yielded Components

The `@glint/environment-ember-loose` package provided utility types `ComponentLike` and `ComponentWithBoundArgs` for
describing the type of abstract component-like values, such as the result of invoking the `{{component ...}}` helper.

Now that signatures have been standardized, `ComponentLike` is now available directly from `@glint/template`, which is
a types-only package that underlies all Glint environments. You can also find `HelperLike` and `ModifierLike` types
there, along with a `WithBoundArgs` type that will work with any of the above, as well as component, helper and modifier
definitions.

{% tabs %}
{% tab title="Contextual Components Before" %}

```typescript
import { ComponentLike, ComponentWithBoundArgs } from '@glint/environment-ember-loose';
import MySpecialInput from '...';

export interface MyComponentSignature {
  Yields: {
    default: [
      {
        // A component that just accepts a `@name` arg
        Label: ComponentLike<{ Args: { name: string } }>;
        // `MySpecialInput`, but with `id` and `form` already bound
        Input: ComponentWithBoundArgs<typeof MySpecialInput, 'id' | 'form'>;
      }
    ];
  };
}
```

{% endtab %}
{% tab title="Contextual Components After" %}

```typescript
import { ComponentLike, WithBoundArgs } from '@glint/template';
import MySpecialInput from '...';

export interface MyComponentSignature {
  Blocks: {
    default: [
      {
        // A component that just accepts a `@name` arg
        Label: ComponentLike<{ Args: { name: string } }>;
        // `MySpecialInput`, but with `id` and `form` already bound
        Input: WithBoundArgs<typeof MySpecialInput, 'id' | 'form'>;
      }
    ];
  };
}
```

{% endtab %}
{% endtabs %}
