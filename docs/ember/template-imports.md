When adding Glint to an Ember project with `ember-template-imports` installed, there are a few additional things to consider.

## Installation

In addition to the `@glint/core`, `@glint/template` and `@glint/environment-ember-loose` packages, you also need to install the `@glint/environment-ember-template-imports` package and configure it in `tsconfig.json` under `glint.environment`:

{% tabs %}
{% tab title="Yarn" %}

```sh
yarn add --dev @glint/core @glint/template @glint/environment-ember-loose @glint/environment-ember-template-imports
```

{% endtab %}
{% tab title="npm" %}

```sh
npm install -D @glint/core @glint/template @glint/environment-ember-loose @glint/environment-ember-template-imports
```

{% endtab %}
{% endtabs %}

{% code title="tsconfig.json" %}

```javascript
{
  "compilerOptions": { /* ... */ },
  "glint": {
    "environment": [
      "ember-loose",
      "ember-template-imports",
    ]
  }
}
```

Additionally, ensure you've added the following statement somewhere in your project's source files or ambient type declarations:

```typescript
import '@glint/environment-ember-template-imports';
```

{% endcode %}

## Template-Only Components

When using `ember-template-imports`, you can declare the type of a `<template>` component using the `TOC` type:

{% code title="app/components/shout.gts %}

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

const Shout: TOC<ShoutSignature> = <template>
    <div ...attributes>
        {{yield (louderPlease @message)}}
    </div>
</template>;
export default Shout;
```

{% endcode %}
