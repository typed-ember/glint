import Component from '@glimmer/component';

// Regression test for https://github.com/typed-ember/glint/issues/1132.
//
// Passing a named block that isn't declared in the component's `Blocks`
// signature must be reported. TypeScript anchors its "Property 'foo' does not
// exist" diagnostic on the synthetic `__glintY__.blockParams[...]` element
// access in the generated code, and its mapping was previously dropped — so
// invoking a component with a nonexistent named block type-checked clean.
//
// The `@glint-expect-error` directives below also exercise directive comments
// *between* named blocks, which were previously discarded entirely.

interface AwaitLikeSignature {
  Args: { promise: Promise<string> };
  Blocks: {
    pending: [];
    error: [error: unknown];
    success: [value: string];
  };
}

class AwaitLike extends Component<AwaitLikeSignature> {
  <template>{{yield to="pending"}}</template>
}

const myPromise = Promise.resolve('hello');

<template>
  {{! Blocks declared in the signature type-check cleanly. }}
  <AwaitLike @promise={{myPromise}}>
    <:pending>loading...</:pending>
    <:error as |err|>{{String err}}</:error>
    <:success as |value|>{{value}}</:success>
  </AwaitLike>

  <AwaitLike @promise={{myPromise}}>
    {{! @glint-expect-error: no block named "loading" in the signature }}
    <:loading>loading...</:loading>
    <:success as |value|>{{value}}</:success>
  </AwaitLike>
</template>;
