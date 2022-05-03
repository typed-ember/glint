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
    MySignature: typeof MySignature;
    'my-signature': typeof MySignature;
  }
}
```

```handlebars
{{yield (component 'my-signature' someArg=true)}}
```

In that case, you can use the `ComponentLike` or `WithBoundArgs` helpers as discussed in [Contextual Components](ember/contextual-components.md):

```typescript
import Component from '@glimmer/component';
import type { WithBoundArgs } from './some-other-component';
import type { ComponentLike } from '@glint/template';

interface MySignature {
  Blocks: {
    default: [WithBoundArgs<typeof SomeOtherComponent, 'someArg'>];
  };
}

export default class MyComponent extends Component<MySignature> {}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    MySignature: typeof MySignature;
    'my-signature': typeof MySignature;
  }
}
```

## does not satisfy the constraint 'InvokableConstructor<AnyFunction>'

```
Type 'typeof SomeComponent' does not satisfy the constraint 'InvokableConstructor<AnyFunction>'.
  Types of construct signatures are incompatible.
    Type 'new (owner: unknown, args: { <your component args> }) => SomeComponent' is not assignable to type 'abstract new (...args: any) => Invokable<AnyFunction>'.
      Property '[Invoke]' is missing in type 'SomeComponent' but required in type 'Invokable<AnyFunction>'.ts(2344)
```

The key here is `Property '[Invoke]' is missing in type...`. This usually means that one of the following is true:

- You don’t have the latest version of Glint
- You don’t have the latest version of the `@glimmer/component` or `@types/ember__component` packages
- You are missing your environment import (e.g. `import '@glint/ember-environment-loose'`)

As a special case of the missing environment import: if you are using a shared base `tsconfig.json` but overriding it in a Yarn workspace or similar setup, if your `"include"` key does not include the file which adds the environment import, it will not work (`include`s are not merged even when using TypeScript's `extends` option, but rather completely override the values from the base config).
