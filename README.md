# Glint [![CI](https://github.com/typed-ember/glint/workflows/CI/badge.svg)](https://github.com/typed-ember/glint/actions?query=workflow%3ACI)

TypeScript-powered tooling for Glimmer templates.

## Overview

Glint is a set of tools to aid in developing code that uses the Glimmer VM for rendering, such as [Ember.js] and [GlimmerX] projects. It's particularly focused on static analysis of templates via TypeScript and the richer editing experience that that enables for both TS and vanilla JS projects.

⚠️ Note: **Glint is still under active development!** Please bear with us and expect breaking changes and rough edges as we work toward a stable release. Also note that Glint is currently only compatible with TypeScript projects.

[ember.js]: https://www.emberjs.com
[glimmerx]: https://github.com/glimmerjs/glimmer-experimental

## Getting Started

You'll first need to add `@glint/core` and an appropriate Glint environment to your project's `devDependencies`. Currently there are two provided environments: `@glint/environment-glimmerx` for [GlimmerX] projects and `@glint/environment-ember-loose` for [Ember.js] projects.

```sh
# If you use Yarn for package management in an Ember project, for example:
yarn add --dev @glint/core @glint/environment-ember-loose
```

Next, you'll add a `.glintrc.yml` file to the root of your project (typically alongside your `tsconfig.json` file). This file tells Glint what environment you're working in and, optionally, which files it should include in its typechecking:

```yml
# .glintrc.yml
environment: ember-loose
include:
  - app/**
```

Finally, you may choose to install an editor extension to display Glint's diagnostics inline in your templates and provide richer editor support, such as the [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=typed-ember.glint-vscode).













