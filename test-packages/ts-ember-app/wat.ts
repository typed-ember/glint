import { expectTypeOf } from 'expect-type';

import type { ComputedPropertyMarker } from '@ember/object/-private/types';
expectTypeOf<ComputedPropertyMarker<unknown>>().not.toBeUnknown();
