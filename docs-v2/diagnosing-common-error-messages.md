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

declare module '@glint/environment-ember-template-imports/registry' {
  export default interface Registry {
    MyComponent: typeof MyComponent;
    'my-component': typeof MyComponent;
  }
}
```

```handlebars
{{yield (component 'my-component' someArg=true)}}
```

In that case, you can use the `ComponentLike` or `WithBoundArgs` types as discussed in [Glint Types](./glint-types.md):

```typescript
import Component from '@glimmer/component';
import type { WithBoundArgs } from '@glint/template';

interface MySignature {
  Blocks: {
    default: [WithBoundArgs<typeof SomeOtherComponent, 'someArg'>];
  };
}

export default class MyComponent extends Component<MySignature> {}

declare module '@glint/environment-ember-template-imports/registry' {
  export default interface Registry {
    MyComponent: typeof MyComponent;
    'my-component': typeof MyComponent;
  }
}
```

## Invalid module name in augmentation

```
Invalid module name in augmentation: module '@glint/environment-ember-template-imports/registry' cannot be found.`
```

TypeScript will only allow you to add declarations for a module if it's already seen the original. In other words,
if you've never directly or transitively imported `@glint/environment-ember-template-imports/registry` anywhere in your project
that TypeScript can see then it won't allow you to add a registry entry.

To fix this, [add `import '@glint/environment-ember-template-imports'` somewhere in your project][env-import]. This will ensure that the
registry, as well as other important type information like template-aware declarations, are visible to vanilla
`tsc` and `tsserver`.

[env-import]: ./ember/installation.md

## Does not satisfy the constraint 'Invokable<AnyFunction>'

```
Type 'typeof SomeComponent' does not satisfy the constraint 'Invokable<AnyFunction>'.
  Types of construct signatures are incompatible.
    Type 'new (owner: unknown, args: { <your component args> }) => SomeComponent' is not assignable to type 'abstract new (...args: any) => InvokableInstance<AnyFunction>'.
      Property '[Invoke]' is missing in type 'SomeComponent' but required in type 'InvokableInstance<AnyFunction>'.ts(2344)
```

The key here is `Property '[Invoke]' is missing in type...`. This usually means that one of the following is true:

- You don’t have the latest version of Glint
- You don’t have the latest version of the `@glimmer/component` or `@types/ember__component` packages
- You are missing your environment import (e.g. `import '@glint/environment-ember-template-imports'`)

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

The `Globals` type represents any values that are globally in scope in a template, like the `let` and `each` keywords. With modern `.gts`/`.gjs` files, most values are explicitly imported, making dependencies clear and providing better type safety.

If you see this error with modern `.gts`/`.gjs` files, make sure you have explicitly imported the component, helper, or modifier you're trying to use:

```typescript
import { SomeHelper } from 'my-addon/helpers/some-helper';
import SomeComponent from 'my-addon/components/some-component';
```

If you have multiple copies of the environment package in your dependencies, this can result in multiple disjoint registries, as TypeScript will maintain a separate version of the `Registry` type for each copy, meaning the registry your dependencies are adding entries to might be different than the one your application is actually using.
