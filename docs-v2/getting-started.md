## Setup

Glint 2 is designed for modern Ember applications using `.gts` (TypeScript) and `.gjs` (JavaScript) files with `<template>` tags. This approach provides the best type safety and developer experience.

First, add `@glint/core`, `@glint/template` and `@glint/environment-ember-template-imports` to your project's `devDependencies`.

Then, add a `"glint"` key in your `tsconfig.json` that tells Glint what environment you're working in:

```json
{
  "compilerOptions": { /* ... */ },
  "glint": {
    "environment": "ember-template-imports"
  }
}
```

For setup instructions specific to your project type, check out the links below:

- [Ember.js Installation](ember/installation.md)

## Migrating from Glint v1 to v2

Please see [Migrating to Glint V2](./migrating-v2.md) for a discussion on to modernize your Ember apps and addons to take full advantage of Glint 2's functionality.

## Using Glint

The `@glint/core` package includes two executables: `glint` and `glint-language-server`.

### Glint CLI

The `glint` CLI can be used to typecheck your project in a similar manner to `tsc`, but with understanding of how values flow through templates.

![A `tsc`-style template type error in the terminal](https://user-images.githubusercontent.com/108688/111076577-1d61db00-84ed-11eb-876a-e5b504758d11.png)

You can use the `glint` executable in CI to ensure you maintain type safety in your templates.

For example, in GitHub Actions you might change this:

```yaml
- name: Typecheck
  run: npx tsc --noEmit
```

To this:

```yaml
- name: Typecheck
  run: npx glint
```

You can also use the `glint` command locally with the `--watch` flag to monitor your project as you work!

#### Single File Checking

Glint supports checking individual files or a specific set of files instead of your entire project. This can be useful for faster feedback during development or when working with large codebases.

```bash
# Check a single file
npx glint src/components/my-component.gts

# Check multiple files
npx glint src/components/header.gts src/components/footer.gts

# Check files with different extensions
npx glint src/helpers/format-date.ts src/components/date-picker.gts
```

When checking specific files, Glint:
- Uses your project's `tsconfig.json` configuration
- Applies the same type checking rules as project-wide checking
- Only analyzes the specified files for faster performance
- Maintains all your project's compiler options and path mappings

### Glint Editor Extensions

You can install an editor extension to display Glint's diagnostics inline in your templates and provide richer editor support&mdash;typechecking, type information on hover, automated refactoring, and more&mdash;powered by `glint-language-server`:

- Install the [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=typed-ember.glint-vscode).

![A type error being shown inline for a template file in VS Code](https://user-images.githubusercontent.com/108688/111076679-995c2300-84ed-11eb-934a-3a29f21be89a.png)

To get Ember/Glimmer and TypeScript working together, Glint creates a separate TS language service instance patched with Ember-specific support. To prevent invalid or duplicate diagnostics you need to disable VSCode's built-in TS language service in your project's workspace only by following these steps:

1. In your project workspace, bring up the extensions sidebar `Ctrl + Shift + X` (macOS: `Cmd + Shift + X`).
1. Type `@builtin typescript` in the extension search box
1. Click the little gear icon of "TypeScript and JavaScript Language Features", and select "Disable (Workspace)".
1. Reload the workspace. Glint will now take over TS language services.
