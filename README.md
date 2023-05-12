# Glint [![CI](https://github.com/typed-ember/glint/workflows/CI/badge.svg)](https://github.com/typed-ember/glint/actions?query=workflow%3ACI)

TypeScript-powered tooling for Glimmer templates.

## Overview

[Glint] is a set of tools to aid in developing code that uses the Glimmer VM for rendering, such as [Ember.js] v3.24+ and [GlimmerX] projects. Similar to [Vetur] for Vue projects or [Svelte Language Tools], Glint consists of a CLI and a language server to provide feedback and enforce correctness both locally during editing and project-wide in CI.

[glint]: https://typed-ember.gitbook.io/glint
[ember.js]: https://www.emberjs.com
[glimmerx]: https://github.com/glimmerjs/glimmer-experimental
[vetur]: https://github.com/vuejs/vetur
[svelte language tools]: https://github.com/sveltejs/language-tools

## Getting Started

Glint is broken into several different packages that you may use, depending on the details of your project. Typically you'll add `@glint/core`, `@glint/template` and a Glint environment package that reflects the type of project you're working on, then add a `"glint"` key to your `tsconfig.json` that tells Glint what it should look at.

For more specific details on setting up Glint in your project, take a look at [the documentation], in particular the Installation pages [for Ember.js projects] and [for GlimmerX projects].

[the documentation]: https://typed-ember.gitbook.io/glint
[for ember.js projects]: https://typed-ember.gitbook.io/glint/environments/ember/installation
[for glimmerx projects]: https://typed-ember.gitbook.io/glint/environments/glimmerx/installation

## Using Glint

The `@glint/core` package includes two executables: `glint` and `glint-language-server`.

The `glint` CLI can be used to typecheck your project in a similar manner to `tsc`, but with understanding of how values flow through templates.

![glint being run at a terminal and producing a tsc-style type error for a template file](https://user-images.githubusercontent.com/108688/111076577-1d61db00-84ed-11eb-876a-e5b504758d11.png)

You can [use the `glint` executable in CI][using-glint] to ensure you maintain type safety in your templates. You can also use the `glint` command locally with the `--watch` flag to monitor your project as you work!

Similarly, `glint-language-server` can be used by editor integrations to expose that same information inline as you type.

![a TypeScript-style type error being shown inline for a template file](https://user-images.githubusercontent.com/108688/111076679-995c2300-84ed-11eb-934a-3a29f21be89a.png)

The language server can also enable your editor to provide other richer help, such as type information on hover, automated refactoring, and more. See [the VS Code extension README](packages/vscode) for further examples.

[using-glint]: https://typed-ember.gitbook.io/glint/getting-started#using-glint
