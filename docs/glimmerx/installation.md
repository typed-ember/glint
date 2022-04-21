{% hint style="warning" %}
Note: GlimmerX is currently not compatible with Glint 0.8. Please use the latest 0.7.x version of `@glint` packages with
GlimmerX projects for the time being.
{% endhint %}

To use Glint with [GlimmerX](https://github.com/glimmerjs/glimmer-experimental), you'll add the `@glint/core` and `@glint/environment-glimmerx` packages to your project's `devDependencies`, then create a `.glintrc.yml` in the root of your project.

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

{% code title="file.js" %}

```yaml
environment: glimmerx
include:
  - 'src/**'
```

{% endcode %}

Note that specifying `include` globs is optional, but may be a useful way to incrementally migrate your project to Glint over time.

{% hint style="info" %}

To minimize spurious errors when typechecking with vanilla `tsc` or your editor's TypeScript integration, you should add `import '@glint/environment-glimmerx';` somewhere in your project's source or type declarations. You may also choose to disable TypeScript's "unused symbol" warnings in your editor, since `tsserver` won't understand that templates actually are using them.

{% endhint %}
