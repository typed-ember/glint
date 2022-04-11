# Glint [![CI](https://github.com/typed-ember/glint/workflows/CI/badge.svg)](https://github.com/typed-ember/glint/actions?query=workflow%3ACI)

TypeScript-powered tooling for Glimmer templates.

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Using Glint](#using-glint)
  - [With GlimmerX](#with-glimmerx)
    - [Import Paths](#import-paths)
    - [Component Signatures](#component-signatures)
    - [Template Components](#template-components)
  - [With Ember.js](#with-emberjs)
    - [Import Paths](#import-paths-1)
    - [Component Signatures](#component-signatures-1)
    - [Ember Components](#ember-components)
    - [Template Registry](#template-registry)
    - [Typing Your Dependencies](#your-dependencies)
    - [Route and Controller Templates](#route-and-controller-templates)
    - [Template-Only Components](#template-only-components)
    - [Rendering Tests](#rendering-tests)
    - [Contextual Components](#contextual-components)
- [Known Limitations](#known-limitations)
  - [Environment Re-exports](#environment-re-exports)
  - [Ember-Specific](#ember-specific)
  - [Tooling](#tooling)

## Overview

Glint is a set of tools to aid in developing code that uses the Glimmer VM for rendering, such as [Ember.js] and [GlimmerX] projects. Similar to [Vetur] for Vue projects, Glint consists of a CLI and a language server to provide feedback and enforce correctness both locally during editing and project-wide in CI.

⚠️ Note: **Glint is still under active development!** Please bear with us and expect breaking changes and rough edges as we work toward a stable release. Also note that Glint is currently only compatible with TypeScript projects, but our aim is ultimately to support JavaScript as well, as TypeScript's tooling can provide best-in-class support for both TS and JS projects.

As Glint is still quickly evolving, it's likely too soon for addons to begin shipping Glint-enabled type declarations themselves. To ease adoption and avoid repeated labor, the community has begun maintaining a shared [`glint-template-types`] repository with Glint-compatible type declarations for commonly used Ember addons. The README there contains information about how to take advantage of these shared declarations for addons you may use in your Ember projects.

[ember.js]: https://www.emberjs.com
[glimmerx]: https://github.com/glimmerjs/glimmer-experimental
[vetur]: https://github.com/vuejs/vetur
[`glint-template-types`]: https://github.com/Gavant/glint-template-types

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

You can use the `glint` executable in CI to ensure you maintain type safety in your templates. For example, you might replace an `ember-try` config's `tsc` invocation with `glint` like this:

```diff
-     command: "tsc --noEmit",
+     command: "glint",
```

You can also use the `glint` command locally with the `--watch` flag to monitor your project as you work!

Similarly, `glint-language-server` can be used by editor integrations to expose that same information inline as you type.

![a TypeScript-style type error being shown inline for a template file](https://user-images.githubusercontent.com/108688/111076679-995c2300-84ed-11eb-934a-3a29f21be89a.png)

The language server can also enable your editor to provide other richer help, such as type information on hover, automated refactoring, and more. See [the VS Code extension README](packages/vscode) for further examples.

### With GlimmerX

To minimize spurious errors when typechecking with vanilla `tsc` or your editor's TypeScript integration, you should add `import '@glint/environment-glimmerx';` somewhere in your project's source or type declarations. You may also choose to disable TypeScript's "unused symbol" warnings in your editor, since `tsserver` won't understand that templates actually are using them.

#### Import Paths

In order for GlimmerX entities to be interpretable by Glint, you currently need to use Glint-specific import paths for `@glimmerx/modifier`, `@glimmerx/helper` and `@glimmerx/component`. Note that [this is not a long-term restriction](#environment-re-exports), but a temporary workaround for the current state of the ecosystem.

| Vanilla GlimmerX      | GlimmerX + Glint                        |
| --------------------- | --------------------------------------- |
| `@glimmerx/component` | `@glint/environment-glimmerx/component` |
| `@glimmerx/modifier`  | `@glint/environment-glimmerx/modifier`  |
| `@glimmerx/helper`    | `@glint/environment-glimmerx/helper`    |

**Note**: because of the way `@glimmerx/babel-plugin-component-templates` currently works, you must still import `hbs` from `@glimmerx/component` or your templates will not be compiled.

#### Component Signatures

While GlimmerX components accept `Args` as a type parameter, the Glint version accepts `Signature`, which contains types for `Element`, `Args` and `Blocks`.

The `Element` field declares what type of element(s), if any, the component applies its passed `...attributes` to. This is often the component's root element. Tracking this type ensures any modifiers used on your component will be compatible with the DOM element(s) they're ultimately attached to. If no `Element` is specified, it will be a type error to set any HTML attributes when invoking your component.

The `Blocks` field specifies the names of any blocks the component yields to, as well as the type of any parameter(s) they'll receive. See the [Yieldable Named Blocks RFC] for further details.
(Note that the `inverse` block is an alias for `else`. These should be defined in `Blocks` as `else`, though `{{yield to="inverse"}}` will continue to work.)

```ts
import Component from '@glint/environment-glimmerx/component';
import { hbs } from '@glimmerx/component';

export interface ShoutSignature {
  // We have a `<div>` as our root element
  Element: HTMLDivElement;
  // We accept one required argument, `message`
  Args: {
    message: string;
  };
  // We yield a single string to the default block, `shoutedMessage`
  Blocks: {
    default?: [shoutedMessage: string];
  };
}

export class Shout extends Component<ShoutSignature> {
  private get louderPlease() {
    return `${this.args.message.toUpperCase()}!`;
  }

  public static template = hbs`
    <div ...attributes>
      {{yield this.louderPlease}}
    </div>
  `;
}
```

[yieldable named blocks rfc]: https://github.com/emberjs/rfcs/blob/master/text/0460-yieldable-named-blocks.md

#### Template Components

In GlimmerX, standalone templates can be invoked as components. Like class-based components, you can declare a signature for a template component in order for Glint to understand how it can be used.

The class-based component above could as a template component like so:

```ts
import type { TemplateComponent } from '@glint/environment-glimmerx/component';

interface ShoutSignature {
  /* same as above */
}

const shout = (message: string) => `${message.toUpperCase()}!`;

const Shout: TemplateComponent<ShoutSignature> = hbs`
  <div ...attributes>
    {{yield (shout @message)}}
  </div>
`;
```

Note that, similar to React's `FunctionComponent` and `FC`, you can also import and use the `TC` type alias as a shorthand for `TemplateComponent`:

```ts
import type { TC } from '@glint/environment-glimmerx/component';
```

### With Ember.js

To minimize spurious errors when typechecking with vanilla `tsc` or your editor's TypeScript integration, you should add `import '@glint/environment-ember-loose';` somewhere in your project's source or type declarations. You may also choose to disable TypeScript's "unused symbol" warnings in your editor, since `tsserver` won't understand that templates actually are using them.

#### Import Paths

In order for GlimmerX entities to be interpretable by Glint, you currently need to use Glint-specific import paths for `@glimmer/component`, `@ember/component` and `ember-modifier`. Note that [this is not a long-term restriction](#environment-re-exports), but a temporary workaround for the current state of the ecosystem.

| Vanilla Ember                    | Ember + Glint                                                  |
| -------------------------------- | -------------------------------------------------------------- |
| `@glimmer/component`             | `@glint/environment-ember-loose/glimmer-component`             |
| `@ember/component`               | `@glint/environment-ember-loose/ember-component`               |
| `@ember/component/helper`        | `@glint/environment-ember-loose/ember-component/helper`        |
| `@ember/component/template-only` | `@glint/environment-ember-loose/ember-component/template-only` |
| `ember-modifier`                 | `@glint/environment-ember-loose/ember-modifier`                |

#### Component Signatures

While Glimmer components accept `Args` as a type parameter, and Ember components accept no type parameters at all, the Glint version of each accepts `Signature`, which contains types for `Element`, `Args` and `Blocks`. These three fields behave in the same way as they do for GlimmerX components, detailed above in that [Component Signatures](#component-signatures) section.

```ts
// app/components/super-table.ts

import Component from '@glint/environment-ember-loose/glimmer-component';

export interface SuperTableSignature<T> {
  // We have a `<table>` as our root element
  Element: HTMLTableElement;
  // We accept an array of items, one per row
  Args: {
    items: Array<T>;
  };
  // We accept two named blocks: an optional `header`, and a required
  // `row`, which will be invoked with each item and its index.
  Blocks: {
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
  Blocks: {
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

Ember components also support `PositionalArgs` in their signature. Such usage is relatively rare, but components such as [`{{animated-if}}`](https://github.com/ember-animation/ember-animated) do take advantage of it. `PositionalArgs` are specified using a tuple type in the same way that block parameters are. You can also include `PositionalArgs` in the signature passed to `ComponentLike` (see below) when declaring types for third-party components.

Note that both `Element` and `PositionalArgs` are not fully integrated with the string-based APIs on the `@ember/component` base class. This means, for example that there's no enforcement that `tagName = 'table'` and `Element: HTMLTableElement` are actually correlated to one another.

#### Template Registry

Because Ember's template resolution occurs dynamically at runtime today, Glint needs a way of mapping the names used in your templates to the actual backing value they'll be resolved to. This takes the form of a "type registry" similar to the one that powers Ember Data's types.

The recommended approach is to include a declaration in each component, modifier or helper module that adds it to the registry, which is the default export of `@glint/environment-ember-loose/registry`.

```ts
// app/components/greeting.ts

import Component from '@glint/environment-ember-loose/glimmer-component';

export default class Greeting extends Component {
  // ...
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    Greeting: typeof Greeting;
  }
}
```

If you've nested your component inside folder(s), you'll need to add the full "strong" name of the component to the registry. And, if you're expecting to invoke your component with curlies or the `{{component}}` helper, you'll need to add the component to the registry twice—once using the `::` delimiter syntax and once using the `/` delimiter syntax. For example:

```ts
// app/components/grouping/my-component.ts
export default class MyComponent extends Component {}
export default interface Registry {
  'Grouping::MyComponent': typeof MyComponent;
  'grouping/my-component': typeof MyComponent;
}
```

This would let glint understand the component if it's invoked in any of the following ways:

```hbs
<Grouping::MyComponent />

{{grouping/my-component}}

{{#let (component 'grouping/my-component') as |Foo|}}
  <Foo />
{{/let}}
```

With strict mode and template imports, the day is coming when we won't need this anymore, because any components/helpers/modifiers you use will already be statically in scope, but for now this is about the best we can do.

#### Typing Your Dependencies

You may want to write types for some components, helpers, or modifiers that are provided by your dependencies. You can do this from a `.d.ts` file.

Here's an example that provides types for the `page-title` helper and the `WelcomePage` component that are present in a newly-generated Ember app:

```ts
// types/global.d.ts
import Helper from '@glint/environment-ember-loose/ember-component/helper';
import { ComponentLike } from '@glint/environment-ember-loose';
import '@glint/environment-ember-loose/registry';

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    WelcomePage: ComponentLike;
    'page-title': new () => Helper<{
      PositionalArgs: [string];
      Return: void;
    }>;
  }
}

```


#### Functional helpers

```ts
import { helper } from '@glint/environment-ember-loose/ember-component/helper';

const myHelper = helper(function myHelper(args: [number], named: { x: number }) {
  return args[0] + named.x;
});

export default myHelper;

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'my-helper': typeof myHelper;
  }
}
```

#### Class helpers

```ts
import Helper from '@glint/environment-ember-loose/ember-component/helper';

interface MyHelperSignature {
  PositionalArgs: [number];
  NamedArgs: {
    x: number;
  };
  Return: number;
}

export default class MyHelper extends Helper<MyHelperSignature> {
  compute(args: [number], named: { x: number }) {
    return (args[0] + named.x);
  }
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'my-helper': typeof MyHelper;
  }
}
```

#### Functional modifiers

```ts
import { modifier } from '@glint/environment-ember-loose/ember-modifier';

const myModifier = modifier((element: Element, args: [string], named: { value: string }) => {
  element.setAttribute(args[0], value);
});

export default myModifier;

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'my-modifier': typeof myModifier;
  }
}
```

#### Class modifiers

```ts
import Modifier from '@glint/environment-ember-loose/ember-modifier';

interface ModifierSignature {
  NamedArgs: {
    attribute: string
  };
  PositionalArgs: [string];
  Element: Element;
}

export default class MyModifier extends Modifier<ModifierSignature> {
  didInstall() {
    this.element.setAttribute(this.named.attribute, this.args.positional[0]);
  }
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'my-modifier': typeof MyModifier;
  }
}
```

#### Route and Controller Templates

Templates associated with Ember routes and/or controllers will be typechecked against those backing classes without needing to import from Glint-specific paths.

If a controller class exists, then `@model` in the corresponding template will have the type of the controller's declared `model` property, and `{{this}}` will be the type of the controller itself.

```ts
export default class MyController extends Controller {
  declare model: MyModelType;

  greeting = 'Hello, world!';
}
```

```hbs
{{this}} {{! MyController }}
{{this.greeting}} {{! string }}
{{this.model}} {{! MyModelType }}
{{@model}} {{! MyModelType }}
```

If no controller exists but a route does, then `{{@model}}` will be the return type of the route's `model()` hook (unwrapping any promise if necessary), and `{{this}}` will be the type of an empty controller with a `model` property of the same type as `@model`.

```ts
export default class MyRoute extends Route {
  async model(): Promise<MyModelType> {
    // ...
  }
}
```

```hbs
{{this}} {{! Controller & { model: MyModelType } }}
{{this.model}} {{! MyModelType }}
{{@model}} {{! MyModelType }}
```

#### Template-Only Components

A template-only component is any template for which Ember (and Glint) can't locate a backing TS or JS module. In Glint, these are treated very similarly to a component with an empty signature: it has no args, and it can't yield to blocks or apply `...attributes` anywhere. Additionally, the value of `{{this}}` in such a template will be `void`.

While it's possible to do some simple things like invoking other components from these templates, typically you'll want to create a backing module for your template so you can declare its signature, add it to the template registry, and so on.

```ts
import templateOnlyComponent from '@glint/environment-ember-loose/ember-component/template-only';

interface ShoutSignature {
  Element: HTMLDivElement;
  Args: { message: string };
  Blocks: {
    default: [shoutedMessage: string];
  };
}

const Shout = templateOnlyComponent<ShoutSignature>();

export default Shout;

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    Shout: typeof Shout;
  }
}
```

Note that the runtime content of this module (effectively `export default templateOnlyComponent();`) is exactly what Ember generates at build time when creating a backing module for a template-only component.

#### Rendering Tests

Templates rendered in tests using `ember-cli-htmlbars`'s `hbs` tag will be checked the same way as standalone `hbs` files.

```ts
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

test('MyComponent works', async function (assert) {
  // If `@arg` is declared to be a string, you'll get a squiggle here
  await render(hbs`<MyComponent @arg={{123}} />`);

  assert.dom().hasText('...');
});
```

In some TypeScript codebases it's common practice to define per-module (or even per-test) context types that include additional properties. If you do this and need to access these properties in your template, you can include the context type as a parameter to `render`.

```ts
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import type { TestContext } from '@ember/test-helpers';

interface MyContext extends TestContext {
  message: string;
}

test('MyComponent works', async function (this: MyContext, assert) {
  this.message = 'hello';

  await render<MyContext>(hbs`
    <MyComponent @arg={{this.message}} />
  `);

  assert.dom().hasText('...');
});
```

#### Contextual Components

When you yield a contextual component, e.g. `{{yield (component "my-component" foo="bar")}}`, you need some way to declare the type of that value in your component signature. For this you can use the `ComponentLike` type, or the `ComponentWithBoundArgs` shorthand.

```ts
interface MyComponentSignature {
  Element: HTMLInputElement;
  Args: {
    value: string;
    count: number;
  };
}

class MyComponent extends Component<MyComponentSignature> {
  // ...
}
```

Given a component like the one declared above, if you wrote this in some other component's template:

```hbs
{{yield (hash
  foo=(component "my-component")
)}}
```

You could type your `Blocks` as:

```ts
Blocks: {
  default: [{ foo: typeof MyComponent }]
}
```

However, if you pre-set the value of the `@value` arg, the consumer shouldn't _also_ need to set that arg. You need a way to declare that that argument is now optional:

```ts
import { ComponentWithBoundArgs } from '@glint/environment-ember-loose';

// ...

Blocks: {
  default: [{ foo: ComponentWithBoundArgs<typeof MyComponent, 'value'> }]
}
```

If you had pre-bound multiple args, you could union them together with the `|` type operator, e.g. `'value' | 'count'`.

Note that `ComponentWithBoundArgs` is effectively shorthand for writing out a `ComponentLike<Signature>` type, which is a generic type that any Glimmer component, Ember component or `{{component}}` return value is assignable to, assuming it has a matching signature.

```ts
import { ComponentLike } from '@glint/environment-ember-loose';

type AcceptsAFooString = ComponentLike<{ Args: { foo: string } }>;

const Ember: AcceptsAFooString = class extends EmberComponent<{ Args: { foo: string } }> {};
const Glimmer: AcceptsAFooString = class extends GlimmerComponent<{ Args: { foo: string } }> {};
const Bound: AcceptsAFooString = /* the result of `{{component "ember-component"}}` */
```

## Known Limitations

As mentioned above, **Glint is not yet stable** and is still under active development. As such, there are currently several known limitations to be aware of.

### Environment Re-exports

Currently, users must import Glint-aware versions of `Component` and other values that are re-exported from their Glint environment rather than being able to directly use the "native" versions. The details of this requirement are explained in the environment-specific "Using Glint" sections above.

This is not a permanent limitation, but rather a result of the base types for those entities not (yet) being extensible in the ways necessary to capture their template behavior. As we're able to make adjustments to those upstream types across the ecosystem to ensure they're extensible, we should be able to shift to use declaration merging instead of completely re-exporting.

Once that's done, consumers should be able to import values the "normal" way directly from the sources packages like `@glimmer/component`.

### Ember-Specific

Glint is not currently integrated with `ember-cli-typescript`, so typechecking performed during an `ember-cli` build will not take templates into account.

In addition, the template registry described in the "With Ember.js" section above must currently be maintained by hand. A few possibilities for mitigating that pain have been discussed, but ultimately the best solution will be when [strict mode] comes to Ember and we no longer need to reckon with runtime resolution of template entities.

[strict mode]: http://emberjs.github.io/rfcs/0496-handlebars-strict-mode.html

### Tooling

The CLI and language server currently have a few known limitations:

- The CLI does not yet support composite projects or `tsc`'s `--build` mode.
- The language server will only operate on projects with a `.glintrc` at their root, not in a subdirectories of the workspace root.
- In VS Code, you will see diagnostics from both TypeScript and Glint in many files, as well as false 'unused symbol' positives for things only referenced in templates. See [the VS Code extension README](packages/vscode) for details on dealing with this.
