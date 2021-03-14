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

## Using Glint

The `@glint/core` package includes two executables: `glint` and `glint-language-server`.

The `glint` CLI can be used to typecheck your project in a similar manner to `tsc`, but with understanding of how values flow through templates.

![glint being run at a terminal and producing a tsc-style type error for a template file](https://user-images.githubusercontent.com/108688/111076577-1d61db00-84ed-11eb-876a-e5b504758d11.png)

You can use the `glint` executable in CI to ensure you maintain type safety in your templates, or locally with the `--watch` flag to monitor your project as you work.

Similarly, `glint-language-server` can be used by editor integrations to expose that same information inline as you type.

![a TypeScript-style type error being shown inline for a template file](https://user-images.githubusercontent.com/108688/111076679-995c2300-84ed-11eb-934a-3a29f21be89a.png)

The language server can also enable your editor to provide other richer help, such as type information on hover, automated refactoring, and more. See [the VS Code extension README](packages/vscode) for further examples.

### With GlimmerX

#### Import Paths

In order for GlimmerX entities to be interpretable by Glint, you currently need to use Glint-specific import paths for `@glimmerx/modifier`, `@glimmerx/helper` and `@glimmerx/component`.

| Vanilla GlimmerX      | GlimmerX + Glint                        |
| --------------------- | --------------------------------------- |
| `@glimmerx/component` | `@glint/environment-glimmerx/component` |
| `@glimmerx/modifier`  | `@glint/environment-glimmerx/modifier`  |
| `@glimmerx/helper`    | `@glint/environment-glimmerx/helper`    |

**Note**: because of the way `@glimmerx/babel-plugin-component-templates` currently works, you must still import `hbs` from `@glimmerx/component` or your templates will not be compiled.

#### Component Signature

While GlimmerX components accept `Args` as a type parameter, the Glint version accepts `Signature`, which contains types for `Args` and `Yields`.

```ts
import Component from '@glint/environment-glimmerx/component';
import { hbs } from '@glimmerx/component';

export interface ShoutSignature {
  // We accept one required argument, `message`
  Args: {
    message: string;
  };
  // We yield a single string to the default block, `shoutedMessage`
  Yields: {
    default?: [shoutedMessage: string];
  };
}

export class Shout extends Component<ShoutSignature> {
  private get louderPlease() {
    return `${this.args.message.toUpperCase()}!`;
  }

  public static template = hbs`
    {{yield this.louderPlease}}
  `;
}
```

### With Ember.js

#### Import Paths

In order for GlimmerX entities to be interpretable by Glint, you currently need to use Glint-specific import paths for `@glimmer/component`, `@ember/component` and `ember-modifier`.

| Vanilla Ember             | Ember + Glint                                           |
| ------------------------- | ------------------------------------------------------- |
| `@glimmer/component`      | `@glint/environment-ember-loose/glimmer-component`      |
| `@ember/component`        | `@glint/environment-ember-loose/ember-component`        |
| `@ember/component/helper` | `@glint/environment-ember-loose/ember-component/helper` |
| `ember-modifier`          | `@glint/environment-glimmerx/ember-modifier`            |

#### Component Signatures

While Glimmer components accept `Args` as a type parameter, and Ember components accept no type parameters at all, the Glint version of each accepts `Signature`, which contains types for `Args` and `Yields`.

```ts
// app/components/super-table.ts

import Component from '@glint/environment-glimmerx/glimmer-component';

export interface SuperTableSignature<T> {
  // We accept an array of items, one per row
  Args: {
    items: Array<T>;
  };
  // We accept two named blocks: an optional `header`, and a required
  // `row`, which will be invoked with each item and its index.
  Yields: {
    header?: [];
    row: [item: T, index: number];
  };
}

export default class SuperTable<T> extends Component<SuperTableSignature<T>> {}
```

```hbs
{{! app/components/super-table.hbs }}

<table ...attributes>
  {{#if (has-block "header")}}
    <thead>
      <tr>{{yield to="header"}}</tr>
    </thead>
  {{/if}}

  <tbody>
    {{#each @items as |item index|}}
      <tr>{{yield item index to="row"}}</tr>
    {{/each}}
  </tbody>
</table>
```

#### Ember Components

Since Ember components don't have `this.args`, it takes slightly more boilerplate to make them typesafe.

```ts
// app/components/greeting.ts

import Component, { ArgsFor } from '@glint/environment-ember-loose/ember-component';
import { computed } from '@ember/object';

export interface GreetingSignature {
  Args: {
    message: string;
    target?: string;
  };
  Yields: {
    default: [greeting: string];
  };
}

// This line declares that our component's args will be 'splatted' on to the instance:
export default interface Greeting extends ArgsFor<GreetingSignature> {}
export default class Greeting extends Component<GreetingSignature> {
  @computed('target')
  private get greetingTarget() {
    // Therefore making `this.target` a legal `string | undefined` property access:
    return this.target ?? 'World';
  }
}
```

```hbs
{{! app/components/greeting.hbs }}

{{yield (concat @message ", " this.greetingTarget "!")}}
```

#### Template Registry

Because Ember's template resolution occurs dynamically at runtime today, Glint needs a way of mapping the names used in your templates to the actual backing value they'll be resolved to. This takes the form of a "type registry" similar to the one that powers Ember Data's types.

The recommended approach is to create a single file, for example at `types/template-registry.d.ts`, in which you can populate references to your app's components, helpers and modifiers.

```ts
// types/template-registry.d.ts

import '@glint/environment-ember-loose/types/registry';

declare module '@glint/environment-ember-loose/types/registry' {
  export default interface Registry {
    capitalize: typeof import('my-app/helpers/capitalize').default;
    Shout: typeof import('my-app/components/shout').default;
    SuperTable: typeof import('my-app/components/super-table').default;
  }
}
```
