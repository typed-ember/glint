With modern `.gts`/`.gjs` files, template-only components are created using the `<template>` syntax with appropriate type annotations.

## Template-Only Components with .gts/.gjs

You can create template-only components directly in `.gts` files using the `TOC` (Template-Only Component) type:

{% code title="app/components/shout.gts" %}

```typescript
import type { TOC } from '@ember/component/template-only';

interface ShoutSignature {
  Element: HTMLDivElement;
  Args: { message: string };
  Blocks: {
    default: [shoutedMessage: string];
  };
}

const louderPlease = (message: string) => message.toUpperCase();

<template>
  <div ...attributes>
    {{yield (louderPlease @message)}}
  </div>
</template> satisfies TOC<ShoutSignature>;
```

{% endcode %}

This approach provides full type safety while keeping your component definition simple and co-located.

## Generic Template-Only Components

For generic template-only components, you can create an empty backing class that extends `@glimmer/component`:

{% code title="app/components/generic-shout.gts" %}

```typescript
import Component from '@glimmer/component';

interface GenericShoutSignature<T> {
  Element: HTMLDivElement;
  Args: { message: T };
  Blocks: {
    default: [shoutedMessage: T];
  };
}

export default class GenericShout<T> extends Component<GenericShoutSignature<T>> {
  get shoutedMessage() {
    return String(this.args.message).toUpperCase();
  }

  <template>
    <div ...attributes>
      {{yield this.shoutedMessage}}
    </div>
  </template>
}
```

{% endcode %}

This provides the same runtime behavior as a template-only component while supporting generic type parameters.
