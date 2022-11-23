// This is a weird way of validating that we're not pulling in the DT types:
// this type *only* exists in the DT types, so if this is *not* an error, we
// *are* (unintentionally, and undesirably) pulling in those types.

// @ts-expect-error -- this import should not exist;
import type { UnwrapComputedPropertyGetter } from '@ember/object/-private/types';

// And *this* is just here to make sure that TS doesn't error because of an
// unused import.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare let x: UnwrapComputedPropertyGetter<string>;
