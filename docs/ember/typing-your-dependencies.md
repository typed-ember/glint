You may want to write types for some components, helpers, or modifiers that are provided by your dependencies. You can do this from a `.d.ts` file.

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
