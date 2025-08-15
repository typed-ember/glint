# Migrating to Glint v2

Glint v2 represents a focused evolution that drops support for `.hbs` templates and other classic Ember paradigms to provide the best possible developer experience atop modern Ember.

By concentrating exclusively on `.gts`/`.gjs` files with `<template>` tags, Glint v2 delivers:

- **Superior type safety** through co-located templates and explicit imports
- **Better developer experience** with first-class TypeScript support
- **Simpler mental model** aligned with modern JavaScript patterns
- **Improved tooling** that works seamlessly with the broader ecosystem

This focused approach allows Glint to provide more reliable, performant, and maintainable tooling for the future of Ember development.

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
