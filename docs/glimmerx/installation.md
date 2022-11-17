To use Glint with [GlimmerX](https://github.com/glimmerjs/glimmer-experimental), you'll add the `@glint/core`, `@glint/template` and `@glint/environment-glimmerx` packages to your project's `devDependencies`, then add a `"glint"` key to your project's `tsconfig.json`.

{% tabs %}
{% tab title="Yarn" %}

```sh
yarn add --dev @glint/core @glint/template @glint/environment-glimmerx
```

{% endtab %}
{% tab title="npm" %}

```sh
npm install -D @glint/core @glint/template @glint/environment-glimmerx
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

Note that, by default, Glint will assume you want it to analyze all templates in the codebase that are covered by your `tsconfig.json`. To ignore any type errors up front so that you can incrementally migrate your project to typesafe templates, consider using [the `auto-glint-nocheck` script](https://github.com/typed-ember/glint/tree/main/packages/scripts#auto-glint-nocheck) to add [`@glint-nocheck` comments](../directives.md#glint-nocheck) to your existing templates that would produce errors.

{% hint style="info" %}

To minimize spurious errors when typechecking with vanilla `tsc` or your editor's TypeScript integration, you should add `import '@glint/environment-glimmerx';` somewhere in your project's source or type declarations. You may also choose to disable TypeScript's "unused symbol" warnings in your editor, since `tsserver` won't understand that templates actually are using them.

{% endhint %}

## Version Requirements

Because Glint uses your project-local copy of TypeScript and the packages whose types it augments for use in templates, it requires certain minimum versions of those packages for compatibility.

| Package       | Minimum Version |
| ------------- | --------------- |
| `typescript`  | 4.7.0           |
| `@glimmerx/*` | 0.6.7           |
