Since the implementation of [RFC 748], Glimmer and Ember components accept a `Signature` type parameter as part of their
definition. This parameter is expected to be an object type with (up to) three members: `Args`, `Element` and `Blocks`.

[rfc 748]: https://github.com/emberjs/rfcs/pull/748

`Args` represents the arguments your component accepts. Typically this will be an object type mapping the names of your
args to their expected type. If no `Args` key is specified, it will be a type error to pass any arguments to your
component.

The `Element` field declares what type of element(s), if any, the component applies its passed `...attributes` to. This
is often the component's root element. Tracking this type ensures any modifiers used on your component will be
compatible with the DOM element(s) they're ultimately attached to. If no `Element` is specified, it will be a type error
to set any HTML attributes or modifiers when invoking your component.

The `Blocks` field specifies the names of any blocks the component yields to, as well as the type of any parameter(s)
those blocks will receive. If no `Blocks` key is specified, it will be a type error to invoke your component in block
form.

Note that the `inverse` block is an alias for `else`. These should be defined in `Blocks` as `else`, though
`{{yield to="inverse"}}` will continue to work.

## Glimmer Components

{% code title="app/components/super-table.ts" %}

```typescript
import Component from '@glimmer/component';

export interface SuperTableSignature<T> {
  // We have a `<table>` as our root element
  Element: HTMLTableElement;
  // We accept an array of items, one per row
  Args: {
    items: Array<T>;
  };
  // We accept two named blocks: a parameter-less `header` block
  // and a `row` block which will be invoked with each item and
  // its index sequentially.
  Blocks: {
    header: [];
    row: [item: T, index: number];
  };
}

export default class SuperTable<T> extends Component<SuperTableSignature<T>> {}
```

{% endcode %}

{% code title="app/components/super-table.hbs" %}

```handlebars
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
import Component from '@ember/component';
import { computed } from '@ember/object';

export interface GreetingSignature {
  Args: {
    message: string;
    target?: string;
  };
  Blocks: {
    default: [greeting: string];
  };
}

// We define this type alias so that we can extend it below:
type GreetingArgs = GreetingSignature['Args'];

// This line declares that our component's args will be 'splatted' on to the instance:
export default interface Greeting extends GreetingArgs {}
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

Ember components also support positional arguments in their signature. Such usage is relatively rare, but components such as [`{{animated-if}}`](https://github.com/ember-animation/ember-animated) do take advantage of it.

{% code title="app/components/greeting.ts" %}

```typescript
// ...

export interface GreetingSignature {
  Args: {
    Named: {
      message: string;
      target?: string;
    };
    Positional: [extraSpecialPreamble: string];
  };
  Blocks: {
    default: [greeting: string];
  };
}

type GreetingArgs = GreetingSignature['Args']['Named'];

export default interface Greeting extends GreetingArgs {}
export default class Greeting extends Component<GreetingSignature> {
  static positionalParams = ['extraSpecialPreamble'];
  declare readonly extraSpecialPreamble: string;
  // ...
}
```

{% endcode %}

Positional args are specified as a `Positional` tuple nested within `Args`, the same way they are in helper and modifier signatures. You can also specify positional args with `ComponentLike` types in this way.

Note that both `Positional` args and the `Element` type are not fully integrated with the string-based APIs on the `@ember/component` base class. This means, for example, that there's no enforcement that `tagName = 'table'` and `Element: HTMLTableElement` are actually correlated to one another.
