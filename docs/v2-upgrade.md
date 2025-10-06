# Migrating to Glint v2

## Overview: Handlebars (aka Loose Mode) No Longer Supported

Glint v2 is a rebuild of Glint v1 atop the [Volar.js](https://volarjs.dev/) language tooling framework, which originated from the Vue team.

As part of this refactor, support for a number of old Ember.js patterns and component authoring formats were dropped so that the Ember Tooling team can focus on providing the best possible tooling experience for modern Ember.

In particular, support for the Ember Loose environment, and therefore all support for Handlebars (.hbs) templates optionally backed by a separate .ts / .js component class file, has been dropped from Glint v2.

The only component authoring format supported by Glint V2 is the [Template Tag Format](https://guides.emberjs.com/release/components/template-tag-format/) by way of `.gts` and `.gjs` files.

Fortunately, there are a couple of codemods ([@embroider/template-tag-codemod](https://www.npmjs.com/package/@embroider/template-tag-codemod) and [ember-codemod-add-template-tags](https://github.com/ijlee2/ember-codemod-add-template-tags)) and other automated/AI solutions for migrating codebases from .hbs to .gts/.gjs. If you still need tooling support for Handlebars for the time being, we do provide a hybrid upgrade path so that codebases can run V1 Glint tooling alongside V2 Glint tooling until they are ready to fully migrate to V2.

## Step 1: Add `@glint/ember-tsc` to devDependencies

Add `@glint/ember-tsc` to your app/addon package.json `devDependencies`.

`ember-tsc` is the v2 version of the `glint` CLI binary; relative to v1's `glint`, it is a _very simple_ and thin wrapper around `tsc`. As such, if you wish to start using `ember-tsc` right away for type-checking your .ts/.gts/.gjs code, you may need to add a few additional `tsc`-style args that you didn't previously need when running v1's `glint` for type-checking. [See here](https://github.com/typed-ember/glint/blob/main/packages/core/README.md) for usage notes.

## Step 2: Upgrade `@glint/template` to the latest NPM version

`@glint/template` is compatible both with v1 and v2 Glint and must remain as a dependency.

## Step 3: Add ambient Glint type imports

As part of your Glint v1 installation, you probably needed to add an import from one or both of `@glint/environment-ember-loose` and `@glint/environment-template-imports`. Search your codebase for where you added these (if you can't find them, then it's possible you added them to your `tsconfig.compilerOptions.types` array, which you can also continue to use as an alternative to the step below). Once you've found these imports, add the following:

```
import "@glint/ember-tsc/types";
```

NOTE: these kinds of ambient imports are not ideal and may go away at some point in the future if/once Ember absorbs and publishes Glint types from `ember-source`.

# Milestone: Hybrid V1 + V2 Glint Installation

At this point in the process, your app/addon has NPM package dependencies both on v1 Glint and v2 Glint.

This means you can run both v1 `glint` which can continue to provide type-checking for .hbs files (if you still need it) or if there is an issue with Glint v2 that is blocking your upgrade, _and_ you can run v2 Glint's `ember-tsc` binary for type-checking `.ts`, `.gts`, and `.gjs` files atop the new v2 architecture.

## Step 4: Install the Glint V2 VSCode extension, disable v1

Glint V2 extension is provided as a sibling extension rather than an upgrade to the existing/original V1 Glint extension to provide a hybrid upgrade path from V1 to V2.

[See Glint V2 in the VSCode Extension Marketplace](https://marketplace.visualstudio.com/items?itemName=typed-ember.glint2-vscode)

NOTE: you must only enable Glint V1 (which has a blue icon) or Glint V2 (orange icon) within a VSCode (or Cursor) workspace. If Glint V2 extension detects that V1 extension is enabled, it'll fail on a startup with a helpful message.

Many teams that still depend on Handlebars templates but increasingly use .gts/.gjs my find it a suitable workflow to use Glint V2 VSCode extension while continuing to rely on V1 `glint` within CI to ensure that nothing was broken within Handlebars templates (but all teams are encouraged to use automated tooling and codemods to migrate to .gts / .gjs as soon as possible).

# Removing V1 Glint

## Step 1: remove v1 dependencies

The following package dependencies can be removed

- `@glint/core`
- `@glint/environment-ember-loose`
- `@glint/environment-ember-template-imports`

Also, search your codebase and remove any ambient imports from the above environment packages.

## Step 2: remove or adjust the `"glint"` configuartion in `tsconfig.json`

Glint V2 actually does NOT require a `"glint"` config object in `tsconfig.json`.

If your `"glint"` config looks something like

```
{
  "compilerOptions": { ... },
  "glint": {
    "environment": ["ember-loose", "ember-template-imports"]
  }
}
```

then you can remove the entire `"glint"` config object.

However, if your `"glint"` config lookgs like this
```
{
  "compilerOptions": { ... },
  "glint": {
    "environment": {
      "ember-loose": { ... },
      "environment-template-imports": { ...TEMPLATE_IMPORTS_CONFIG... }
    }
  }
}
```

then you can move all of the `environment-template-imports` config to the top-level "glint" config, i.e.:

```
{
  "compilerOptions": { ... },
  "glint": { ...TEMPLATE_IMPORTS_CONFIG... }
}
```

The `ember-loose` config can be removed entirely, as Glint V2 dropped support for Loose Mode.

NOTE: Glint V2 will read from `tsconfig.glint.environment.environment-template-imports` config object if it is present, otherwise it will consult the top level object for things like `additionalGlobals` and `additionalSpecialForms`.

