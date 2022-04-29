Adding Glint support to TypeScript-based addons can provide a lot of value. 

First, the addon itself will benefit from the additional typing coverage, as all templates in rendering tests or the dummy app will get type checked, thus increasing type safety and decreasing the likelihood of any type inconsistencies to sneak in over time (e.g. false positives in tests).

Second, it makes consuming the addon for Glint-enabled apps much easier, providing proper Glint-compatible types out of the box.

## Publishing addons with Glint types

The first part is adding the proper Glint signature types to all the addon's components, helpers and modifiers, just the same way as described in these guides.

If all apps were already using [first class component templates] (i.e. [strict mode] templates), this would be all it needs. But as this is certainly not the case for the time being, we will need to find a way to expose the required [Template Registry] entries to the consuming app, in an easy but also flexible way.

As described in the [Using Addons] guide, the *easy* way for users is to import a file from the addon containing all the registry entries. This is for the most common case in which the app is consuming the addon provided components, helpers and modifiers as they are. The convention here is for the addon - when published on npm - to provide a `glint.d.ts` file, that the app will import as `import 'awesome-addon/glint'`. For a (v1) addon using [`ember-cli-typescript`][ect] this would be a `/addon/glint.ts` file, which needs to contain all the registry entries for all the public components (helpers, modifiers) the addon exposes to the app (in the addon's `/app` tree):

{% code title="addon/glint.ts" %}

```typescript
import type ButtonComponent from 'awesome-addon/components/button';
import type ModalComponent from 'awesome-addon/components/modal';

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    AwesomeButton: typeof ButtonComponent;
    AwesomeModal: typeof ModalComponent;
    // ...
  }
}
```

{% endcode %}

While this easy way, which only requires the app to import this single file, is sufficient for the majority of cases, it also has its limitations. Apps can replace or extend addon provided components (helpers, modifiers), by creating a component in the app itself with the same name. The addon provided types as proposed above will likely not be fully matching, so we also need to support a *flexible* way.

This is given by letting the app manage the registry entries on its own, thereby being able to pick what to import from the addon directly and what to replace with its own custom types.

There is one caveat though: it is generally recommended for app code to define the registry entries right in the actual file itself, so that it is nicely co-located with the signature and implementation. But when the app would import such a module from an addon, TypeScript would see that registry declaration and apply it, which is what we want to prevent, so the app can do that. So for addons it is recommended that all the registry entries are only added to the `addon/glint.ts` file as described above, and *not* to the file of the actual class!

A real world example of this setup can be seen in [`ember-responsive-image`][eri]


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