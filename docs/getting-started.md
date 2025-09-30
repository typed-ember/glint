## Setup

Glint is designed for modern Ember applications using `.gts` (TypeScript) and `.gjs` (JavaScript) files with `<template>` tags. This approach provides the best type safety and developer experience.

First, add `@glint/ember-tsc` and `@glint/template` to your project's `devDependencies`.

### Add ambient types

Add the following ambient import somewhere in your project (for example in a `.d.ts` file or an existing ambient types file):

```typescript
import '@glint/ember-tsc/types';
```

Alternatively, you can add `@glint/ember-tsc/types` to your `tsconfig.json` file(s) within the `compilerOptions.types` array:

```json
{
  "compilerOptions": {
    // ...
    "types": ["@glint/ember-tsc/types"]
  }
}
```

## Migrating from Glint v1 to v2

Please see [Upgrading to Glint V2](v2-upgrade.md) for how to gradually upgrade an existing app from Glint v1 to Glint v2.

## Using Glint

Use the `ember-tsc` executable provided by `@glint/ember-tsc` for typechecking.

### ember-tsc CLI

The `ember-tsc` CLI can be used to typecheck your project in a similar manner to `tsc`, but with understanding of how values flow through templates.

You can use the `ember-tsc` executable in CI to ensure you maintain type safety in your templates.

For example, in GitHub Actions you might change this:

```yaml
- name: Typecheck
  run: npx tsc --noEmit
```

To this:

```yaml
- name: Typecheck
  run: npx ember-tsc --noEmit
```

You can also use the `ember-tsc` command locally with the `--watch` flag to monitor your project as you work!

### Glint Editor Extensions

You can install an editor extension to display Glint's diagnostics inline in your templates and provide richer editor support&mdash;typechecking, type information on hover, automated refactoring, and more&mdash;powered by `glint-language-server`:

- Install the [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=typed-ember.glint2-vscode).

![A type error being shown inline for a template file in VS Code](https://user-images.githubusercontent.com/108688/111076679-995c2300-84ed-11eb-934a-3a29f21be89a.png)
