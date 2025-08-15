Glint is configured by adding a `"glint"` key to your project's `tsconfig.json` or `jsconfig.json` file.

{% code title="tsconfig.json" %}

```javascript
{
  "compilerOptions": { /* ... */ },
  "include": [ /* ... */ ],
  "glint": {
    "environment": "ember-template-imports"
  }
}
```

{% endcode %}

Each key is summarized in further detail below.

## `environment`

The `environment` key specifies what Glint environment(s) your project is operating in. For modern Ember.js projects using `.gts`/`.gjs` files, you should use `"environment": "ember-template-imports"`. You may also specify an array if your project operates in multiple environments.

Some environments may accept user-specified configuration. To pass configuration into one or more environments, you can use an object literal mapping environment names to their config:

```javascript
"glint" {
  "environment": {
    "ember-template-imports": {
      "additionalGlobals": ["my-special-template-macro"]
    }
  }
}
```
