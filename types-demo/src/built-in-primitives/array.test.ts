import { expectType, expectError } from 'tsd';
import { resolve, BuiltIns, invokeInline } from '@glint/template';

// TODO: probably treat the array helper as notation for an actual array literal in TS

const array = resolve(BuiltIns['array']);

// Empty arrays are `Array<unknown>`. Better would be `Array<never>`, which we could
// get by translating `{{array 1 2 3}}` into a literal instead of a helper invocation.
expectType<Array<unknown>>(invokeInline(array({})));

// Arrays infer their element type correctly
expectType<Array<string>>(invokeInline(array({}, 'hi')));

// Heterogeneous arrays are an error (a limitation, not an intentional constraint)
expectError(invokeInline(array({}, 'hi', 123)));

// Casting the first element to the appropriate union allows for heterogeneous arrays
expectType<Array<string | number>>(invokeInline(array({}, 'hi' as string | number, 123)));
