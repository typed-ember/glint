import Helper from '@ember/component/helper';

// Companion to helper-invocation-args.test.gts (#1168): exercises OPTIONAL
// args. Omitting an optional arg must be allowed, while wrong types and missing
// *required* args are still reported now that the "Expected N arguments"
// diagnostic maps back to the template.

// Optional named arg (`str?`), alongside a required positional.
class OptionalNamedHelper extends Helper<{
  Args: {
    Positional: [count: number];
    Named: { str?: string };
  };
  Return: number;
}> {}

// Optional trailing positional arg (`second?`), no named args.
class OptionalPositionalHelper extends Helper<{
  Args: {
    Positional: [first: string, second?: number];
  };
  Return: number;
}> {}

// Optional positional arg (`label?`) sitting *before* a required named-args
// hash (`flag`).
class OptionalPositionalThenNamedHelper extends Helper<{
  Args: {
    Positional: [count: number, label?: string];
    Named: { flag: boolean };
  };
  Return: number;
}> {}

<template>
  {{! An optional named arg may be omitted or provided. }}
  {{OptionalNamedHelper 1}}
  {{OptionalNamedHelper 1 str="ok"}}

  {{! ...but it is still type-checked when provided. }}
  {{! @glint-expect-error: optional named arg has the wrong type }}
  {{OptionalNamedHelper 1 str=123}}

  {{! The required positional is still required. }}
  {{! @glint-expect-error: missing required positional arg }}
  {{OptionalNamedHelper str="ok"}}

  {{! An optional trailing positional arg may be omitted or provided. }}
  {{OptionalPositionalHelper "a"}}
  {{OptionalPositionalHelper "a" 2}}

  {{! ...but it is still type-checked when provided. }}
  {{! @glint-expect-error: optional positional arg has the wrong type }}
  {{OptionalPositionalHelper "a" "two"}}

  {{! The required positional is still required. }}
  {{! @glint-expect-error: missing required positional arg }}
  {{OptionalPositionalHelper}}

  {{! Providing every arg works. }}
  {{OptionalPositionalThenNamedHelper 1 "label" flag=true}}

  {{! KNOWN LIMITATION: an optional positional arg that sits *before* a required
      named-args hash cannot currently be omitted. Glint models the named args
      as the final positional parameter, so dropping the optional positional
      shifts the hash into its slot and the arg count no longer lines up. }}
  {{! @glint-expect-error: optional positional cannot be skipped before named args }}
  {{OptionalPositionalThenNamedHelper 1 flag=true}}
</template>;
