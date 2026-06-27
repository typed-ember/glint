import Helper, { helper } from '@ember/component/helper';

// Regression test for https://github.com/typed-ember/glint/issues/1168.
//
// A plain (non-curried) helper invocation must type-check its arguments. In
// particular, a missing required positional argument surfaces TypeScript's
// "Expected N arguments, but got M" diagnostic. That diagnostic anchors on the
// synthetic `resolve(...)` callee rather than on the args, and its mapping was
// previously dropped — so these invocations type-checked clean when they should
// have errored. The issue reproduced across all three ways of authoring a
// helper, so each is covered below.

// 1. Class-based helper
class ClassHelper extends Helper<{
  Args: {
    Positional: [count: number];
    Named: { str: string };
  };
  Return: number;
}> {}

// 2. Functional helper
const functionalHelper = helper(
  (_positional: [count: number], _named: { str: string }): number => 1,
);

// 3. Plain function helper
const plainFunctionHelper = (_count: number, _named: { str: string }): number => 1;

<template>
  {{! Valid invocations type-check cleanly. }}
  {{ClassHelper 1 str="ok"}}
  {{functionalHelper 1 str="ok"}}
  {{plainFunctionHelper 1 str="ok"}}

  {{! @glint-expect-error: missing required positional arg }}
  {{ClassHelper str="ok"}}
  {{! @glint-expect-error: missing required positional arg }}
  {{functionalHelper str="ok"}}
  {{! @glint-expect-error: missing required positional arg }}
  {{plainFunctionHelper str="ok"}}

  {{! @glint-expect-error: positional arg is the wrong type }}
  {{ClassHelper "nope" str="ok"}}
  {{! @glint-expect-error: positional arg is the wrong type }}
  {{functionalHelper "nope" str="ok"}}
  {{! @glint-expect-error: positional arg is the wrong type }}
  {{plainFunctionHelper "nope" str="ok"}}

  {{! @glint-expect-error: named arg is the wrong type }}
  {{ClassHelper 1 str=123}}
  {{! @glint-expect-error: named arg is the wrong type }}
  {{functionalHelper 1 str=123}}
  {{! @glint-expect-error: named arg is the wrong type }}
  {{plainFunctionHelper 1 str=123}}
</template>;
