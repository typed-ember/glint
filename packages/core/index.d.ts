import './-private/built-ins/resolutions';

export { resolve, resolveOrReturn, ResolveContext } from './-private/resolution';
export { invokeInline, invokeBlock, invokeModifier } from './-private/invoke';
export { toBlock } from './-private/blocks';
export { template } from './-private/template';
export { default as BuiltIns } from './-private/built-ins/primitives';
