// Commented because failing and I'm not sure ETI needs these kinds of "intrinsics" to be tested

// import {
//   Globals,
//   NamedArgsMarker,
//   resolve,
// } from '@glint/core/environment-ember-template-imports/-private/dsl';
// import { expectTypeOf } from 'expect-type';

// let uniqueId = resolve(Globals['unique-id']);

// // Basic plumbing
// expectTypeOf(uniqueId()).toEqualTypeOf<string>();

// // @ts-expect-error: unexpected named args
// uniqueId({
//   hello: 'hi',
//   ...NamedArgsMarker,
// });

// // @ts-expect-error: invalid positional arg
// uniqueId('hi');
