Glint does its best to provide good error messages, but there are a number of cases where we are left with whatever TypeScript provides. This page documents the most common confusing type errors you might see.

## Cannot assign an abstract constructor type

```
error TS2322: Type 'abstract new () => PartiallyAppliedComponent<...> is not assignable to type 'typeof <Your Component>'.
  Cannot assign an abstract constructor type to a non-abstract constructor type.
```

This usually means that you have written a signature for a “contextual component” (or “higher-order component”) which accepts a component as an argument or yields it in one of its blocks, like this.

```typescript
import Component from '@glimmer/component';
import type SomeOtherComponent from './some-other-component';

interface MySignature {
  Blocks: {
    default: [typeof SomeOtherComponent];
  };
}

export default class MyComponent extends Component<MySignature> {}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    MyComponent: typeof MyComponent;
    'my-component': typeof MyComponent;
  }
}
```

```handlebars
{{yield (component 'my-component' someArg=true)}}
```

In that case, you can use the `ComponentLike` or `WithBoundArgs` helpers as discussed in [Contextual Components](ember/contextual-components.md):

```typescript
import Component from '@glimmer/component';
import type { WithBoundArgs } from '@glint/template';

interface MySignature {
  Blocks: {
    default: [WithBoundArgs<typeof SomeOtherComponent, 'someArg'>];
  };
}

export default class MyComponent extends Component<MySignature> {}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    MyComponent: typeof MyComponent;
    'my-component': typeof MyComponent;
  }
}
```

## Does not satisfy the constraint 'InvokableConstructor<AnyFunction>'

```
Type 'typeof SomeComponent' does not satisfy the constraint 'InvokableConstructor<AnyFunction>'.
  Types of construct signatures are incompatible.
    Type 'new (owner: unknown, args: { <your component args> }) => SomeComponent' is not assignable to type 'abstract new (...args: any) => Invokable<AnyFunction>'.
      Property '[Invoke]' is missing in type 'SomeComponent' but required in type 'Invokable<AnyFunction>'.ts(2344)
```

The key here is `Property '[Invoke]' is missing in type...`. This usually means that one of the following is true:

- You don’t have the latest version of Glint
- You don’t have the latest version of the `@glimmer/component` or `@types/ember__component` packages
- You are missing your environment import (e.g. `import '@glint/environment-ember-loose'`)

As a special case of the missing environment import: if you are using a shared base `tsconfig.json` but overriding it in a Yarn workspace or similar setup, if your `"include"` key does not include the file which adds the environment import, it will not work (`include`s are not merged even when using TypeScript's `extends` option, but rather completely override the values from the base config).

## The given value does not appear to be usable as a component, modifier or helper.

```
error TS2769: The given value does not appear to be usable as a component, modifier or helper.
  No overload matches this call.
    The last overload gave the following error.
      Argument of type 'Something' is not assignable to parameter of type '(...positional: unknown[]) => unknown'.
```

This error appears when you attempt to use a value in a template whose type Glint doesn't recognize. Normally, Glint relies on the active environment(s) to declare, using types from `@glint/template`, exactly _how_ something like the base `Component` class works when you use it in a template.

Accordingly, if Glint doesn't see that declaration, it may indicate one of a few things:
 - You have multiple copies of `@glint/template` in your dependency tree
 - You have an out-of-date copy of the library your template value is based on (like `ember-modifier` or `@glimmer/component`)
 - The value you're using in your template isn't something your Glint environment is aware of (e.g. it has a custom manager)

## Property does not exist on type 'Globals'

```
error TS7053: Element implicitly has an 'any' type because expression of type '"Something"' can't be used to index type 'Globals'.
  Property 'Something' does not exist on type 'Globals'.
```

The `Globals` type represents any values that are globally in scope in a template, like the `let` and `each` keywords. In a resolver-based environment like `@glint/environment-ember-loose`, this also includes all members of [the `Registry` interface](ember/template-registry.md) that are declared by your application and its dependencies.

If you see this error in a loose mode template, ensure that:
 - A registry entry exists for the name in question
 - You have imported the file where the entry is defined, if it comes from a library (i.e. `import 'ember-page-title/glint';`)
 - You only have one copy of the environment package in your dependency tree

If you have multiple copies of the environment package in your dependencies, this can result in multiple disjoint registries, as TypeScript will maintain a separate version of the `Registry` type for each copy, meaning the registry your dependencies are adding entries to might be different than the one your application is actually using.
