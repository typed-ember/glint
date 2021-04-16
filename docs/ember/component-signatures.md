While Glimmer components accept `Args` as a type parameter, and Ember components accept no type parameters at all, the Glint version of each accepts `Signature`, which contains types for `Element`, `Args` and `Yields`.

The `Args` field functions the same way the `Args` type parameter does with normal `@glimmer/component` usage.

The `Element` field declares what type of element(s), if any, the component applies its passed `...attributes` to. This is often the component's root element. Tracking this type ensures any modifiers used on your component will be compatible with the DOM element(s) they're ultimately attached to. If no `Element` is specified, it will be a type error to set any HTML attributes when invoking your component.

The `Yields` field specifies the names of any blocks the component yields to, as well as the type of any parameter(s) they'll receive. See the [Yieldable Named Blocks RFC] for further details.
(Note that the `inverse` block is an alias for `else`. These should be defined in `Yields` as `else`, though `{{yield to="inverse"}}` will continue to work.)

## Glimmer Components

{% code title="app/components/super-table.ts" %}

```typescript
import Component from '@glint/environment-ember-loose/glimmer-component';

export interface SuperTableSignature<T> {
  // We have a `<table>` as our root element
  Element: HTMLTableElement;
  // We accept an array of items, one per row
  Args: {
    items: Array<T>;
  };
  // We accept two named blocks: an optional `header`, and a required
  // `row`, which will be invoked with each item and its index.
  Yields: {
    header?: [];
    row: [item: T, index: number];
  };
}

export default class SuperTable<T> extends Component<SuperTableSignature<T>> {}
```

{% endcode %}

{% code title="app/components/super-table.hbs" %}

```handlebars
{{! app/components/super-table.hbs }}

<table ...attributes>
  {{#if (has-block 'header')}}
    <thead>
      <tr>{{yield to='header'}}</tr>
    </thead>
  {{/if}}

  <tbody>
    {{#each @items as |item index|}}
      <tr>{{yield item index to='row'}}</tr>
    {{/each}}
  </tbody>
</table>
```

{% endcode %}

## Ember Components

Since Ember components don't have `this.args`, it takes slightly more boilerplate to make them typesafe.

{% code title="app/components/greeting.ts" %}

```typescript
import Component, { ArgsFor } from '@glint/environment-ember-loose/ember-component';
import { computed } from '@ember/object';

export interface GreetingSignature {
  Args: {
    message: string;
    target?: string;
  };
  Yields: {
    default: [greeting: string];
  };
}

// This line declares that our component's args will be 'splatted' on to the instance:
export default interface Greeting extends ArgsFor<GreetingSignature> {}
export default class Greeting extends Component<GreetingSignature> {
  @computed('target')
  private get greetingTarget() {
    // Therefore making `this.target` a legal `string | undefined` property access:
    return this.target ?? 'World';
  }
}
```

{% endcode %}

{% code title="app/components/greeting.hbs" %}

```handlebars
{{yield (concat @message ', ' this.greetingTarget '!')}}
```

{% endcode %}

Ember components also support `PositionalArgs` in their signature. Such usage is relatively rare, but components such as [`{{animated-if}}`](https://github.com/ember-animation/ember-animated) do take advantage of it. `PositionalArgs` are specified using a tuple type in the same way that block parameters are. You can also include `PositionalArgs` in the signature passed to `ComponentLike` (see below) when declaring types for third-party components.

Note that both `Element` and `PositionalArgs` are not fully integrated with the string-based APIs on the `@ember/component` base class. This means, for example that there's no enforcement that `tagName = 'table'` and `Element: HTMLTableElement` are actually correlated to one another.
