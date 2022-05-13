To use Glint with [Ember](https://github.com/emberjs/ember.js), you'll add the `@glint/core` and `@glint/environment-ember-loose` packages to your project's `devDependencies`, then create a `.glintrc.yml` in the root of your project.

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

{% code title=".glintrc.yml" %}

```yaml
environment: ember-loose
include:
  - 'app/**'
```

{% endcode %}

Note that specifying `include` globs is optional, but may be a useful way to incrementally migrate your project to Glint over time.

{% hint style="info" %}

To minimize spurious errors when typechecking with vanilla `tsc` or your editor's TypeScript integration, you should add `import '@glint/environment-ember-loose';` somewhere in your project's source or type declarations. You may also choose to disable TypeScript's "unused symbol" warnings in your editor, since `tsserver` won't understand that templates actually are using them.

{% endhint %}

## Ember CLI TypeScript

If you are using Glint with TypeScript and Ember, visit the [Ember CLI TypeScript documentation](https://docs.ember-cli-typescript.com/) for more information.