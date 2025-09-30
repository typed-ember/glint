Glint 2 is designed specifically for modern Ember projects using `.gts` and `.gjs` files with `<template>` tags. This is the recommended approach for new projects and the migration path for existing projects.

## Installation

For Glint 2, you need to install `@glint/ember-tsc` and `@glint/template`:

{% tabs %}
{% tab title="pnpm" %}

```sh
pnpm add -D @glint/ember-tsc @glint/template
```

{% endtab %}
{% tab title="Yarn" %}

```sh
yarn add -D @glint/ember-tsc @glint/template
```

{% endtab %}
{% tab title="npm" %}

```sh
npm install -D @glint/ember-tsc @glint/template
```

{% endtab %}
{% endtabs %}

Add the following ambient import somewhere in your project (for example in a `.d.ts` file or an existing ambient types file):

```typescript
import '@glint/ember-tsc/types';
```

No additional `tsconfig.json` `glint` configuration is required for most projects. If you need to add globals available in templates, use the `glint.additionalGlobals` option in your `tsconfig.json`.

## Migrating from .hbs Files

If you're currently using separate `.hbs` template files with `.ts`/`.js` backing classes, you'll need to convert them to `.gts`/`.gjs` files to use Glint 2:

### 1. Use the Template Tag Codemod

The [@embroider/template-tag-codemod](https://www.npmjs.com/package/@embroider/template-tag-codemod) can help automate the conversion from separate `.hbs` + `.ts`/`.js` files to `.gts`/`.gjs` files.

**Important**: This codemod requires migrating your build tools to [Embroider](https://github.com/embroider-build/embroider) first. While this is a significant undertaking, it's a valuable migration that keeps your app aligned with modern Ember and the broader JavaScript ecosystem.

The codemod works with both classic `@ember/component` and modern `@glimmer/component`, so you can convert to `.gts`/`.gjs` files first and defer component modernization for later.

### 2. Manual Conversion

For smaller projects or specific files, you can manually convert:

1. Rename your `.ts` file to `.gts` (or `.js` to `.gjs`)
2. Move your template content from the `.hbs` file into a `<template>` tag at the end of your component file
3. Delete the separate `.hbs` file
4. Import any components, helpers, or modifiers used in your template

### 3. Future CLI Tool

After the Glint v2 rollout, we may release a standalone CLI tool that works with legacy `.hbs` files, but this is not guaranteed. Community contributions are welcome for such tooling.

## Template-Only Components

When using `ember-template-imports`, you can declare the type of a `<template>` component using the `TOC` type:

{% code title="app/components/shout.gts" %}

```glimmer-ts
import type { TOC } from '@ember/component/template-only';

interface ShoutSignature {
  Element: HTMLDivElement;
  Args: { message: string };
  Blocks: {
    default: [shoutedMessage: string];
  };
}

const louderPlease = (message: string) => message.toUpperCase();

<template>
    <div ...attributes>
        {{yield (louderPlease @message)}}
    </div>
</template> satisfies TOC<ShoutSignature>;
```

{% endcode %}
