import { hash as emberHash } from '@ember/helper';
import type { TOC } from '@ember/component/template-only';

// The built-in 7.1 {{hash}} keyword infers a different type than the
// `@ember/helper` import it replaces: contextual typing from the target narrows
// `__typename` to the 'TimePeriod' literal through the import, but not through
// the keyword (it stays `string`), so the keyword fails this literal-typed union
// the import satisfies. (Stripping the NamedArgs brand does not change it.)
type TimePeriod = { __typename: 'TimePeriod' };
type IdTimePeriod = { __typename: 'IDTimePeriod'; id: string };

const Period: TOC<{ Args: { period?: TimePeriod | IdTimePeriod } }> = <template></template>;

<template>
  <Period @period={{emberHash __typename="TimePeriod"}} />
  {{! @glint-expect-error keyword should match the import; remove once fixed }}
  <Period @period={{hash __typename="TimePeriod"}} />
</template>
