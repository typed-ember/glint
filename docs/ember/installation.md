To use Glint with [Ember](https://github.com/emberjs/ember.js), you'll add the `@glint/core` and `@glint/environment-ember-loose` packages to your project's `devDependencies`, then add a `"glint"` key to your project's `tsconfig.json`.

{% tabs %}
{% tab title="Yarn" %}

```sh
yarn add --dev @glint/core @glint/environment-ember-loose
```

{% endtab %}
{% tab title="npm" %}

```sh
npm install -D @glint/core @glint/environment-ember-loose
```

{% endtab %}
{% endtabs %}

{% code title="tsconfig.json" %}

```javascript
{
  "compilerOptions": { /* ... */ },
  "glint": {
    "environment": "ember-loose"
  }
}
```

{% endcode %}

Note that, by default, Glint will assume you want it to analyze all templates in the codebase that are covered by your `tsconfig.json`. See the [Configuration](../configuration.md) guide for further details on configuring Glint's behavior.

{% hint style="info" %}

To minimize spurious errors when typechecking with vanilla `tsc` or your editor's TypeScript integration, you should add `import '@glint/environment-ember-loose';` somewhere in your project's source or type declarations. You may also choose to disable TypeScript's "unused symbol" warnings in your editor, since `tsserver` won't understand that templates actually are using them.

{% endhint %}

## Functions as Helpers

By default, `@glint/environment-ember-loose` includes support for the [default helper manager RFC](https://github.com/emberjs/rfcs/pull/756).

If your project uses an older version of Ember, you can have Glint treat attempted use of functions as helpers as a type error by setting `allowPlainFunctionInvocation: false` in your environment configuration.

{% code title="tsconfig.json" %}

```javascript
{
  "compilerOptions": { /* ... */ },
  "glint": {
    "environment": {
      "ember-loose": {
        "allowPlainFunctionInvocation": false
      }
    }
  }
}
```

{% endcode %}

## Ember CLI TypeScript

If you are using Glint with TypeScript and Ember, visit the [Ember CLI TypeScript documentation](https://docs.ember-cli-typescript.com/) for more information.
