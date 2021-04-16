import { emitComponent, resolve } from '../../-private/dsl';
import { InElementKeyword } from '../../-private/keywords';

const inElementKeyword = resolve({} as InElementKeyword);

declare const element: HTMLElement;

// Can be invoked with an element
emitComponent(inElementKeyword({}, element));

// Accepts an `insertBefore` argument
emitComponent(inElementKeyword({ insertBefore: null }, element));
emitComponent(inElementKeyword({ insertBefore: undefined }, element));

// @ts-expect-error: rejects invocation with `undefined`
emitComponent(inElementKeyword({}));
// @ts-expect-error: rejects invocation with `null`
emitComponent(inElementKeyword({}, null));
// @ts-expect-error: rejects any other values for `insertBefore`
emitComponent(inElementKeyword({ insertBefore: true }, element));
// @ts-expect-error: rejects any other values for `insertBefore`
emitComponent(inElementKeyword({ insertBefore: 'foo' }, element));
// @ts-expect-error: rejects any other values for `insertBefore`
emitComponent(inElementKeyword({ insertBefore: 1 }, element));
// @ts-expect-error: rejects any other values for `insertBefore`
emitComponent(inElementKeyword({ insertBefore: {} }, element));
