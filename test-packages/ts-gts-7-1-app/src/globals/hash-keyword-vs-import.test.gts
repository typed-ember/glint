import { hash as emberHash } from '@ember/helper';
import type { TOC } from '@ember/component/template-only';

// Regression guard: the built-in {{hash}} keyword must narrow its named-arg
// values against the assignment target the same way the `@ember/helper` import
// does — so a string-literal arg (`__typename`) matches this literal-typed union
// instead of staying widened to `string`. Both invocations below must compile.
type TimePeriod = { __typename: 'TimePeriod' };
type IdTimePeriod = { __typename: 'IDTimePeriod'; id: string };

const Period: TOC<{ Args: { period?: TimePeriod | IdTimePeriod } }> = <template></template>;

<template>
  <Period @period={{emberHash __typename="TimePeriod"}} />
  <Period @period={{hash __typename="TimePeriod"}} />
</template>
