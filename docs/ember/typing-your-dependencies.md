You may want to write types for some components, helpers, or modifiers that are provided by your dependencies. You can do this from a `.d.ts` file.

Here's an example that provides types for the `page-title` helper and the `WelcomePage` component that are present in a newly-generated Ember app:

{% code title="types/global.d.ts" %}

```typescript
import Helper from '@glint/environment-ember-loose/ember-component/helper';
import { ComponentLike } from '@glint/environment-ember-loose';

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    WelcomePage: ComponentLike;

    'page-title': new () => Helper<{
      PositionalArgs: [string];
      Return: void;
    }>;
  }
}
```

{% endcode %}
