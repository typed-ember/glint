Because Ember's template resolution occurs dynamically at runtime today, Glint needs a way of mapping the names used in your templates to the actual backing value they'll be resolved to. This takes the form of a "type registry" similar to the one that powers Ember Data's types.

The recommended approach is to include a declaration in each component, modifier or helper module that adds it to the registry, which is the default export of `@glint/environment-ember-loose/registry`.

## Components

{% code title="app/components/greeting.ts" %}

```typescript
import Component from '@glint/environment-ember-loose/glimmer-component';

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

This would let glint understand the component if it's invoked in any of the following ways:

```handlebars
<Grouping::MyComponent />

{{grouping/my-component}}

{{#let (component 'grouping/my-component') as |Foo|}}
  <Foo />
{{/let}}
```

With strict mode and template imports, the day is coming when we won't need this anymore, because any components/helpers/modifiers you use will already be statically in scope, but for now this is about the best we can do.

## Functional helpers

```typescript
import { helper } from '@glint/environment-ember-loose/ember-component/helper';

const myHelper = helper(function myHelper(args: [number], named: { x: number }) {
  return args[0] + named.x;
});

export default myHelper;

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'my-helper': typeof myHelper;
  }
}
```

#### Class helpers

```typescript
import Helper from '@glint/environment-ember-loose/ember-component/helper';

interface MyHelperSignature {
  PositionalArgs: [number];
  NamedArgs: {
    x: number;
  };
  Return: number;
}

export default class MyHelper extends Helper<MyHelperSignature> {
  compute(args: [number], named: { x: number }) {
    return args[0] + named.x;
  }
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'my-helper': typeof MyHelper;
  }
}
```

#### Functional modifiers

```typescript
import { modifier } from '@glint/environment-ember-loose/ember-modifier';

const myModifier = modifier((element: Element, args: [string], named: { value: string }) => {
  element.setAttribute(args[0], value);
});

export default myModifier;

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'my-modifier': typeof myModifier;
  }
}
```

#### Class modifiers

```typescript
import Modifier from '@glint/environment-ember-loose/ember-modifier';

interface ModifierSignature {
  NamedArgs: {
    attribute: string;
  };
  PositionalArgs: [string];
  Element: Element;
}

export default class MyModifier extends Modifier<ModifierSignature> {
  didInstall() {
    this.element.setAttribute(this.named.attribute, this.args.positional[0]);
  }
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'my-modifier': typeof MyModifier;
  }
}
```
