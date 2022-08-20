To use Glint with [GlimmerX](https://github.com/glimmerjs/glimmer-experimental), you'll add the `@glint/core` and `@glint/environment-glimmerx` packages to your project's `devDependencies`, then add a `"glint"` key to your project's `tsconfig.json`.

{% tabs %}
{% tab title="Yarn" %}

```sh
yarn add --dev @glint/core @glint/environment-glimmerx
```

{% endtab %}
{% tab title="npm" %}

```sh
npm install -D @glint/core @glint/environment-glimmerx
```

{% endtab %}
{% endtabs %}

{% code title="tsconfig.json" %}

```javascript
{
  "compilerOptions": { /* ... */ },
  "glint": {
    "environment": "glimmerx"
  }
}
```

{% endcode %}

Note that, by default, Glint will assume you want it to analyze all templates in the codebase that are covered by your `tsconfig.json`. See the [Configuration](../configuration.md) guide for further details on configuring Glint's behavior.

{% hint style="info" %}

To minimize spurious errors when typechecking with vanilla `tsc` or your editor's TypeScript integration, you should add `import '@glint/environment-glimmerx';` somewhere in your project's source or type declarations. You may also choose to disable TypeScript's "unused symbol" warnings in your editor, since `tsserver` won't understand that templates actually are using them.

{% endhint %}
