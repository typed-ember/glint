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
