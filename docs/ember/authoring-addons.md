Adding Glint support to TypeScript-based addons can provide a lot of value.

First, the addon itself will benefit from the additional typing coverage, as all templates in rendering tests or the dummy app will get type checked, thus increasing type safety and decreasing the likelihood of any type inconsistencies sneaking in over time (e.g. false positives in tests).

Second, it makes consuming the addon for Glint-enabled apps much easier, providing proper Glint-compatible types out of the box.

## Publishing addons with Glint types

The first step is adding the proper Glint signature types to all the addon's components, helpers and modifiers, just the same way as described in these guides.

If all apps were already using [first class component templates] (i.e. [strict mode] templates), this would be all we need to do. But as this is certainly not the case for the time being, we will need to find a way to expose the required [Template Registry] entries to the consuming app, in an easy but also flexible way.

As described in the [Using Addons] guide, the _easy_ way for users is to import a file from the addon containing all the registry entries. This is for the most common case in which the app is consuming the addon provided components, helpers and modifiers as they are. The convention here is for the addon - when published on npm - to provide a `glint.d.ts` file, that the app will import as `import 'awesome-addon/glint'`. For a (v1) addon using [`ember-cli-typescript`][ect] this would be a `/addon/glint.ts` file, which needs to contain all the registry entries for all the public components (helpers, modifiers) the addon exposes to the app (in the addon's `/app` tree):

{% code title="/addon/glint.ts" %}

```typescript
import type AwesomeButton from 'awesome-addon/components/awesome-button';
import type AwesomeModal from 'awesome-addon/components/awesome-modal';

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    AwesomeButton: typeof AwesomeButton;
    AwesomeModal: typeof AwesomeModal;
    // ...
  }
}
```

{% endcode %}

While this easy way, which only requires the app to import this single file, is sufficient for the majority of cases, it also has its limitations. Apps can replace or extend addon provided components (helpers, modifiers), by creating a component in the app itself with the same name. The addon provided types as proposed above may not match the app's replacements, so we also need to support a _flexible_ approach that accounts for this.

This is given by letting the app manage the registry entries on its own, thereby being able to pick what to import from the addon directly and what to replace with its own custom types.

Note: in apps, we generally define the registry entries right in the actual file itself so that it is nicely co-located with the signature and implementation. If an app imported such a module from an addon, though, TypeScript would see the registry declaration there and apply it, which is exactly what we want to prevent. For addons it is therefore recommended that all the registry entries are only added to the `/addon/glint.ts` file as described above, and _not_ to the file containing the actual class!

A real world example of this setup can be seen in [`ember-responsive-image`][eri]

## Adding Glint types to addons not written in TypeScript

Even if an addon author has choosen not to adopt TypeScript, the addon can still ship Glint types! The setup, however, will be slightly different. First, without [`ember-cli-typescript`][ect], types in `/addon/glint.ts` won't be emitted to `/glint.d.ts` on publish, so you'll need to do what you would have done in `/addon/glint.ts` in `/glint.d.ts` instead. Also, since the components, helpers, and modifiers are not written in TypeScript, we can't add type signatures to them directly. Instead we'll need to create declaration files for them. And these files will need to use the importable path directly from the root of the addon (not under `/addon/`). Here's an example:

{% code title="/components/awesome-button.d.ts" %}

```typescript
import Component from '@glimmer/component';

interface AwesomeButtonSignature {
  Element: HTMLButtonElement;
  Args: {
    label: string;
  };
}

export default class AwesomeButton extends Component<AwesomeButtonSignature> {}
```

{% endcode %}

{% code title="/helpers/awesome-sauce.d.ts" %}

```typescript
import Helper from '@ember/component/helper';

interface AwesomeSauceSignature {
  Args: {
    Positional: [string];
  };
  Return: string;
}

export default class AwesomeSauce extends Helper<AwesomeSauceSignature> {}
```

{% endcode %}

{% code title="/glint.d.ts" %}

```typescript
import type AwesomeButton from './components/awesome-button';
import type AwesomeSauce from './helpers/awesome-sauce';

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    AwesomeButton: typeof AwesomeButton;
    'awesome-sauce': typeof AwesomeSauce;
    // ...
  }
}
```

{% endcode %}

By defining the component, helper, and modifier types in separate importable files (rather than just directly in `glint.d.ts`), consumers can import them individually and manually add to the registry if they so choose.

## Stability Note

{% hint style="warning" %}
Note: **Glint is still under active development!** Please bear with us and expect breaking changes and rough edges as we work toward a stable release. This could also affect the users of your addon, so you might want to see your addon's Glint support as experimental for now!
{% endhint %}

[strict mode]: http://emberjs.github.io/rfcs/0496-handlebars-strict-mode.html
[first class component templates]: http://emberjs.github.io/rfcs/0779-first-class-component-templates.html
[template registry]: template-registry.md
[using addons]: using-addons.md
[ect]: https://github.com/typed-ember/ember-cli-typescript
[eri]: https://github.com/kaliber5/ember-responsive-image
