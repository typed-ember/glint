Your app likely uses already a lot of addons, and most if not all of them will not ship with Glint-compatible types yet. This means that for all the components, helpers or modifiers that you use, you will need to add some types so Glint can understand them.

The community has begun maintaining a shared [`glint-template-types`] repository with Glint-compatible type declarations for commonly used Ember addons. The README there contains information about how to take advantage of these shared declarations for addons you may use in your Ember projects.

## Typing your dependencies

For addons that neither ship their own types nor are covered by any existing shared ambient declarations as mentioned above, you will need to write their types by yourself. You can do this from a `.d.ts` file.

Here's an example that provides types for the `page-title` helper and the `WelcomePage` component that are present in a newly-generated Ember app:

{% code title="types/global.d.ts" %}

```typescript
import { ComponentLike, HelperLike } from '@glint/template';

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    WelcomePage: ComponentLike;
    'page-title': HelperLike<{
      Args: { Positional: [title: string] };
      Return: void;
    }>;
  }
}
```

{% endcode %}

These two entries provide all the type information necessary for the application template in the default app blueprint
to typecheck.

{% code title="app/templates/application.hbs" %}

```handlebars
{{page-title 'MyApp'}}

{{! The following component displays Ember's default welcome message. }}
<WelcomePage />
{{! Feel free to remove this! }}

{{outlet}}
```

{% endcode %}

## Using Glint-enabled addons

For addons that already ship with Glint-compatible types there is only a little to do. Their README might contain some specific instructions, but if the addon follows Glint's recommendations for [authoring addons][authoring], the basic steps are as follows.

If you are already using [strict mode] templates (via [first class component templates]), you are already explicitly importing all the components, helpers and modifiers in use by the template, so Glint already has all the typing information at hand, and nothing more is required!

But more likely you are still using classic `.hbs` template files, for which Glint needs to know e.g. which component _name_ maps to which component _class_ and hence its type. This is managed by the [Template Registry], which needs to be extended for all the components, helpers and modifiers provided by the addon.

By convention according to the [Authoring Guide][authoring], the addon will ship a `template-registry.d.ts` file that exports a type containing all the registry entries for components, helpers and modifiers it exposes. To use these entries, you can declare that the `@glint/environment-ember-loose` registry `extends` the addon registry in the same place you add your local declarations.

{% code title="types/global.d.ts" %}

```typescript
import '@glint/environment-ember-loose';

import type ResponsiveImageRegistry from 'ember-responsive-image/template-registry';

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry extends ResponsiveImageRegistry, /* other addon registries */ {
    // local entries
  }
}
```

{% endcode %}

In the majority of cases this should be all you need!

However, if you have for example extended or overridden a component of that addon, by having an implementation with the same name in your _app_, but with a somewhat different shape (e.g. additional arguments), then you will need to tweak the registry entries you add, as the ones provided by the addon will not match the type of your replaced component.

Add the registry entry for the replaced component as you would for any other of your app, as described under [Template Registry]. To include everything _except_ a specific component, you can use TypeScript's `Omit` utility type on the original registry to leave that entry out. 

{% code title="types/global.d.ts" %}

```typescript
import type ResponsiveImageRegistry from 'ember-responsive-image/template-registry';

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry extends Omit<ResponsiveImageRegistry, 'ResponsiveImage'> {
    ResponsiveImage: typeof MyCustomOverriddenResponsiveImage;
    // ...
  }
}
```

{% endcode %}

You can also ignore the registry entirely and instead import and add _only_ individual entries from an addon:

{% code title="types/global.d.ts" %}

```typescript
import type ResponsiveImage from 'ember-responsive-image/components/responsive-image';

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    ResponsiveImage: typeof ResponsiveImage;
    // ...
  }
}
```

{% endcode %}

[`glint-template-types`]: https://github.com/Gavant/glint-template-types
[authoring]: authoring-addons.md
[strict mode]: http://emberjs.github.io/rfcs/0496-handlebars-strict-mode.html
[first class component templates]: http://emberjs.github.io/rfcs/0779-first-class-component-templates.html
[template registry]: template-registry.md
