// Yuck. This will work for generic functions if the types are fixed given the initial args,
// but otherwise they'll degrade to `unknown` in the type of the returned function.
// I don't think there's a better way to type `{{fn}}` though; this already maintains more type
// info than Ramda's `partial`, for instance.
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/539042117cd697da07daf93092bdf16bc14922d8/types/ramda/index.d.ts#L1310-L1324

import { NoNamedArgs, ReturnsValue } from '../signature';

// prettier-ignore
export default interface FnHelper {
  <Ret, Args extends unknown[]>(args: NoNamedArgs, f: (...rest: Args) => Ret): ReturnsValue<(...rest: Args) => Ret>;
  <A, Ret, Args extends unknown[]>(args: NoNamedArgs, f: (a: A, ...rest: Args) => Ret, a: A): ReturnsValue<(...rest: Args) => Ret>;
  <A, B, Ret, Args extends unknown[]>(args: NoNamedArgs, f: (a: A, b: B, ...rest: Args) => Ret, a: A, b: B): ReturnsValue<(...rest: Args) => Ret>;
  <A, B, C, Ret, Args extends unknown[]>(args: NoNamedArgs, f: (a: A, b: B, c: C, ...rest: Args) => Ret, a: A, b: B, c: C): ReturnsValue<(...rest: Args) => Ret>;
  <A, B, C, D, Ret, Args extends unknown[]>(args: NoNamedArgs, f: (a: A, b: B, c: C, d: D, ...rest: Args) => Ret, a: A, b: B, c: C, d: D): ReturnsValue<(...rest: Args) => Ret>;
}
