# `@glint/environment-ember-template-imports`

This package contains the information necessary for glint to typecheck an `ember-template-imports` project.

Add this environment to your `tsconfig.json` as follows in order to enable it:

```javascript
{
  "compilerOptions": { /* ... */ },
  "glint": {
    "environment": [
      "ember-template-imports"
    ]
  }
}
```

