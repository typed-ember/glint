Because Ember's template resolution occurs dynamically at runtime today, Glint needs a way of mapping the names used in your templates to the actual backing value they'll be resolved to. This takes the form of a "type registry" similar to the one that powers Ember Data's types.

The recommended approach is to include a declaration in each component, modifier or helper module that adds it to the registry, which is the default export of `@glint/environment-ember-loose/registry`.

With [first-class component templates][fccts], the day is coming when we won't need this anymore, because any components/helpers/modifiers you use will already be statically in scope, but for now this approach ensures compatibility with the effective global scope of loose-mode templates.

[fccts]: https://github.com/emberjs/rfcs/pull/779

## Components

{% code title="app/components/greeting.ts" %}

```typescript
import Component from '@glimmer/component';

export default class Greeting extends Component {
  // ...
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    Greeting: typeof Greeting;
  }
}
```

{% endcode %}

If you've nested your component inside folder(s), you'll need to add the full "strong" name of the component to the registry. And, if you're expecting to invoke your component with curlies or the `{{component}}` helper, you'll need to add the component to the registry twice—once using the `::` delimiter syntax and once using the `/` delimiter syntax. For example:

{% code title="app/components/grouping/my-component.ts" %}

```typescript
export default class MyComponent extends Component {}
export default interface Registry {
  'Grouping::MyComponent': typeof MyComponent;
  'grouping/my-component': typeof MyComponent;
}
```

{% endcode %}

This would let Glint understand the component if it's invoked in any of the following ways:

```handlebars
<Grouping::MyComponent />

{{grouping/my-component}}

{{#let (component 'grouping/my-component') as |Foo|}}
  <Foo />
{{/let}}
```

## Helpers and Modifiers

Helpers and modifiers can be added to the registry using the `typeof` type operator in much the same way as components:

```typescript
import { helper } from '@ember/component/helper';

const sum = helper((values: Array<number>) => {
  return values.reduce((sum, next) => sum + next, 0);
});

export default sum;

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    sum: typeof sum;
  }
}
```
