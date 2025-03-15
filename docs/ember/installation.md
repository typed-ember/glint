To use Glint with [Ember](https://github.com/emberjs/ember.js) v3.24 or higher, you'll need to:
 1. add the `@glint/core`, `@glint/template` and `@glint/environment-ember-loose` packages to your project's `devDependencies`
 2. add a `"glint"` key with appropriate config to your project's `tsconfig.json`
 3. add `import '@glint/environment-ember-loose';` somewhere in your project 

Read on for a more detailed explanation of each of these steps.

{% tabs %}
{% tab title="pnpm" %}

```sh
pnpm add -D @glint/core @glint/template @glint/environment-ember-loose
```

{% endtab %}
{% tab title="Yarn" %}

```sh
pnpm add -D @glint/core @glint/template @glint/environment-ember-loose
```

{% endtab %}
{% tab title="npm" %}

```sh
npm install -D @glint/core @glint/template @glint/environment-ember-loose
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

{% hint style="info" %}

Using `ember-template-imports`? See [Ember: Template Imports][etii] for additional installation steps.

[etii]: ../ember/template-imports.md#installation

{% endhint %}

Note that, by default, Glint will assume you want it to analyze all templates in the codebase that are covered by your `tsconfig.json`. To ignore any type errors up front so that you can incrementally migrate your project to typesafe templates, consider using [the `auto-glint-nocheck` script](https://github.com/typed-ember/glint/tree/main/packages/scripts#auto-glint-nocheck) to add [`@glint-nocheck` comments](../directives.md#glint-nocheck) to your existing templates that would produce errors.

Finally, ensure you've added the following statement somewhere in your project's source files or ambient type declarations:

```typescript
import '@glint/environment-ember-loose';
```

{% hint style="info" %}

When typechecking with vanilla `tsc` or your editor's `tsserver` integration, adding this side-effect `import` statement ensures that TypeScript is aware of the Glint-specific types provided by the environment package. Without this line, you may find that vanilla TypeScript produces spurious errors.

{% endhint %}

## Version Requirements

Because Glint uses your project-local copy of TypeScript and the packages whose types it augments for use in templates, it requires certain minimum versions of those packages for compatibility.

| Package                   | Minimum Version |
| ------------------------- | --------------- |
| `typescript`              | 4.8.0           |
| `@types/ember__component` | 4.0.8           |
| `@glimmer/component`      | 1.1.2           |
| `ember-modifier`          | 3.2.7           |

It's possible to use the 4.x versions of the `@types/ember*` packages even if your project is still using an Ember 3.x LTS. Just note that any deprecated APIs you're using that were removed in 4.0 won't be available in the types, and APIs added later _will_ be present in them.

## Ember CLI TypeScript

If you are using Glint with TypeScript and Ember, visit the [Ember CLI TypeScript documentation](https://docs.ember-cli-typescript.com/) for more information.
