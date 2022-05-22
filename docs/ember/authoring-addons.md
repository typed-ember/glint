Adding Glint support to TypeScript-based addons can provide a lot of value. 

First, the addon itself will benefit from the additional typing coverage, as all templates in rendering tests or the dummy app will get type checked, thus increasing type safety and decreasing the likelihood of any type inconsistencies sneaking in over time (e.g. false positives in tests).

Second, it makes consuming the addon for Glint-enabled apps much easier, providing proper Glint-compatible types out of the box.

## Publishing addons with Glint types

The first step is adding the proper Glint signature types to all the addon's components, helpers and modifiers, just the same way as described in these guides.

If all apps were already using [first class component templates] (i.e. [strict mode] templates), this would be all we need to do. But as this is certainly not the case for the time being, we will need to find a way to expose the required [Template Registry] entries to the consuming app, in an easy but also flexible way.

As described in the [Using Addons] guide, the *easy* way for users is to import a file from the addon containing all the registry entries. This is for the most common case in which the app is consuming the addon provided components, helpers and modifiers as they are. The convention here is for the addon - when published on npm - to provide a `glint.d.ts` file, that the app will import as `import 'awesome-addon/glint'`. For a (v1) addon using [`ember-cli-typescript`][ect] this would be a `/addon/glint.ts` file, which needs to contain all the registry entries for all the public components (helpers, modifiers) the addon exposes to the app (in the addon's `/app` tree):

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

While this easy way, which only requires the app to import this single file, is sufficient for the majority of cases, it also has its limitations. Apps can replace or extend addon provided components (helpers, modifiers), by creating a component in the app itself with the same name. The addon provided types as proposed above may not match the app's replacements, so we also need to support a *flexible* approach that accounts for this.

This is given by letting the app manage the registry entries on its own, thereby being able to pick what to import from the addon directly and what to replace with its own custom types.

Note: in apps, we generally define the registry entries right in the actual file itself so that it is nicely co-located with the signature and implementation. If an app imported such a module from an addon, though, TypeScript would see the registry declaration there and apply it, which is exactly what we want to prevent. For addons it is therefore recommended that all the registry entries are only added to the `/addon/glint.ts` file as described above, and *not* to the file containing the actual class!

A real world example of this setup can be seen in [`ember-responsive-image`][eri]

## Adding Glint types to addons not written in TypeScript

Even if an addon author has choosen not to adopt TypeScript, the addon can still ship Glint types! The setup, however, differs from the one above. 

Because the addon has no TypeScript, TypeScript—and subsequently Glint—does not know where to look for published types. Furthermore, because the addon's components, helpers, and modifiers are not written in TypeScript, we can't add type signatures to them directly. Finally, because the addon does not use [`ember-cli-typescript`][ect], any types added in `/addon/glint.ts` would not be emitted to `/glint.d.ts` on publish. 

We can address the three issues by, first, using the `typesVersions` field in the addon's `package.json` file to announce the location of the addon's types. Next, we can create a `types/` directory for the addon and create separate declaration files for each component, helper, and modifier in the `types/components`, `types/helpers`, and `types/modifiers` directories, respectively. Finally, we can include all of the addon's registry entries in a `types/glint.d.ts` file.

### Using `typesVersions` to publish types

Add the following `typesVersions` field to the addon's `package.json` file. For v2 addons, this should be the "own JavaScript" `package.json`, typically located in `/addon` or in `/packages/addon-name/`. For v1 addons, this will be the root-level `package.json`.

{% code title="/package.json"}

```json
"typesVersions": {
  "*": {
    "*": [
      "types/*"
    ]
  }
}
```

{% endcode %}

This field tells TypeScript to look in the `types/` directory (relative to the addon's `package.json` file) for types for all versions of TypeScript. _The TypeScript Handbook_ has [more documentation about using `typesVersions` to publish types][typesVersions].

### Declare components, helpers, and modifiers in `types/`

Using `typesVersions`, we can store each component's, helper's, and modifier's declaration file neatly within their corresponding directories in the `types/` directory. This lets the consuming app use a sensible importable path without cluttering the root level of the addon. For example:

{% code title="types/components/awesome-button.d.ts" %}

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

{% code title="types/helpers/awesome-sauce.d.ts" %}

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

Helper declarations may still cause type-checking errors in the consuming app or in your editor because Ember does not yet ship with published types. As such, it is advisable to add [`@types/ember__component`][types-ember-component] to the addon's `devDependencies` if the addon includes helpers. Components and modifiers have their types already built in and need no additional dependencies.

### Collecting registry entries in `types/glint.d.ts`.

{% code title="types/glint.d.ts" %}

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
[Template Registry]: template-registry.md
[Using Addons]: using-addons.md
[ect]: https://github.com/typed-ember/ember-cli-typescript
[eri]: https://github.com/kaliber5/ember-responsive-image
[typesVersions]: https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html#version-selection-with-typesversions
[types-ember-component]: https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/ember__component
