If you're adding Glint into a project that uses `ember-template-imports`, there are several key factors to keep in mind.

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
