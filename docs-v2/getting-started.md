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

## Migrating from .hbs Files

If you're currently using separate `.hbs` template files with `.ts`/`.js` backing classes, you'll need to migrate to `.gts`/`.gjs` files to use Glint 2. Here's how:

### 1. Convert to .gts/.gjs Files

The recommended approach is to convert your codebase to use `.gts` (TypeScript) or `.gjs` (JavaScript) files instead of separate template and backing class files.

### 2. Use the Template Tag Codemod

There's a codemod that can help automate this conversion: [@embroider/template-tag-codemod](https://www.npmjs.com/package/@embroider/template-tag-codemod).

**Important**: This codemod requires migrating your build tools to Embroider first. While this is a significant undertaking, it's a valuable migration that keeps your app aligned with modern Ember and the broader JavaScript ecosystem.

The codemod works with both classic `@ember/component` and modern `@glimmer/component`, so you can convert to `.gts`/`.gjs` files first and defer the component modernization for later.

### 3. Future CLI Tool

After the Glint v2 rollout, we may release a standalone CLI tool that works with legacy `.hbs` files, but this is not guaranteed. Community contributions are welcome for such tooling.

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

### Glint Editor Extensions

You can install an editor extension to display Glint's diagnostics inline in your templates and provide richer editor support&mdash;typechecking, type information on hover, automated refactoring, and more&mdash;powered by `glint-language-server`:

- Install the [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=typed-ember.glint-vscode).

![A type error being shown inline for a template file in VS Code](https://user-images.githubusercontent.com/108688/111076679-995c2300-84ed-11eb-934a-3a29f21be89a.png)

To get Ember/Glimmer and TypeScript working together, Glint creates a separate TS language service instance patched with Ember-specific support. To prevent invalid or duplicate diagnostics you need to disable VSCode's built-in TS language service in your project's workspace only by following these steps:

1. In your project workspace, bring up the extensions sidebar `Ctrl + Shift + X` (macOS: `Cmd + Shift + X`).
1. Type `@builtin typescript` in the extension search box
1. Click the little gear icon of "TypeScript and JavaScript Language Features", and select "Disable (Workspace)".
1. Reload the workspace. Glint will now take over TS language services.

![Disabling built-in TS language service per workspace](https://user-images.githubusercontent.com/108688/111069039-6dc84100-84cb-11eb-8339-18a589be2ac5.png)