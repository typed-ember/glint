Glint is configured by adding a `"glint"` key to your project's `tsconfig.json` or `jsconfig.json` file.

{% code title="tsconfig.json" %}

```javascript
{
  "compilerOptions": { /* ... */ },
  "include": [ /* ... */ ],
  "glint": {
    "environment": "ember-loose"
  }
}
```

{% endcode %}

The general shape of the value of the `"glint"` key looks like this:

```typescript
interface GlintConfigInput {
  environment: string | Array<string> | Record<string, unknown>;
  checkStandaloneTemplates?: boolean;
  transform?: {
    include?: string | Array<string>;
    exclude?: string | Array<string>;
  };
}
```

Each key is summarized in further detail below.

## `environment`

The `environment` key specifies what Glint environment(s) your project is operating in. For instance, in loose-mode Ember.js project where you have `@glint/environment-ember-loose` installed, you could specify `"environment": "ember-loose"`. You may also specify an array if your project operates in multiple environments.

Some environments may accept user-specified configuration. To pass configuration into one or more environments, you can use an object literal mapping environment names to their config:

```javascript
"glint" {
  "environment": {
    "ember-loose": {},
    "glimmerx": {
      "additionalGlobals": ["my-special-template-macro"]
    }
  }
}
```

## `checkStandaloneTemplates`

In environments like `ember-loose` that support templates in separate files from their backing class, Glint normally determines whether to typecheck a template based on whether its backing class is in a `.ts` or `.js` file. However, for a template-only component, there's no backing module to check.

This flag defaults to `true`, and setting it to `false` means Glint will never produce type errors for templates that don't have a corresponding `.js` or `.ts` file.

## `transform`

This key allows you to opt specific paths in or out of being treated as "template aware" by Glint. By default, all files covered by your `tsconfig.json`/`jsconfig.json` will be transformed by Glint to reflect the contents of any templates they either contain or are associated with.

{% hint style="info" %}

Templates in files excluded by this configuration will be completely ignored by Glint, meaning they won't show any type errors, but **they won't get any other editor support like hover info or go-to-definition** either.

If you're in the process of migrating a codebase to Glint, or have an old section you don't intend to make typesafe, consider adding [`@glint-nocheck` comments](../directives.md#glint-nocheck), potentially using [the `auto-glint-nocheck` script](https://github.com/typed-ember/glint/tree/main/packages/scripts#auto-glint-nocheck), instead.

{% endhint %}

Each key may be either a glob or an array of globs, relative to the location of your config file. Specifying `include` stop Glint from transforming _any_ files that don't match the given glob(s), while specifying `exclude` will leave Glint's transformation enabled by default and only disable it for the given globs. If a file is matched by both `include` _and_ `exclude`, it will be excluded.

For example, given this configuration:

```javascript
"glint" {
  "environment": "ember-loose",
  "transform": {
    "include": "app/components/**",
    "exclude": [
      "app/components/not-ready-yet.*",
      "app/components/none-of-these/**"
    ]
  }
}
```

The following paths would have their templates analyzed:

- `app/components/welcome.{ts,hbs}`
- `app/components/some/nested/thing.{ts,hbs}`

While these would not:

- `app/components/not-ready-yet.{ts,hbs}`
- `app/components/none-of-these/deeply/nested.{ts,hbs}`
- `app/templates/application.hbs`
- `tests/integration/components/welcome-test.ts`
