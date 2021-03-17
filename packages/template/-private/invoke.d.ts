import { AcceptsBlocks } from './signature';
import { BlockBodies } from './blocks';

/**
 * Invokes the given value as an inline expression to be emitted to the DOM.
 * This corresponds to a mustache statement either at the top level or being
 * passed as an attribute or concatenated into a string:
 *
 *     {{value}}
 *     {{value foo=bar}}
 *     <div data-x={{value foo=bar}}>
 *     <div data-x="hello {{value foo=bar}}">
 */
export declare function invokeEmit<
  T extends AcceptsBlocks<{}> | string | number | boolean | null | void
>(value: T): void;

/**
 * Invokes the given value as an entity that expects to receive blocks
 * rather than return a value. This corresponds to a block-form mustache
 * statement or any angle-bracket component invocation, i.e.:
 *
 *     {{#value foo=bar}}{{/value}}
 *     <Value @foo={{bar}}></Value>
 *     <Value @foo={{bar}} />
 *
 * This form of invocation is the only one in a template that accepts
 * blocks.
 */
export declare function invokeBlock<Yields>(
  value: AcceptsBlocks<Yields>,
  blocks: BlockBodies<Yields>
): void;
