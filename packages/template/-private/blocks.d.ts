/**
 * This module contains types pertaining to defining and working with
 * blocks in templates. In general, a block body is represented as a
 * generator function that iterates over `BlockYield` values, whose
 * types encode the block name and type of parameters that are being
 * yielded.
 *
 * For example, in an invocation like this:
 *
 *     invokeBlock(resolve(BuiltIns['each'])({}, ['a', 'b', 'c']), {
 *       *default(letter, index) {
 *         yield toBlock('body', `Letter #${index}: ${letter}`);
 *       }
 *     })
 *
 * A `default` block is being passed to the each helper, which determines
 * that the types of the params it receives are a `string` and a `number`.
 *
 * The result of this invocation would be a `BlockYield<'body', [string]>`,
 * which could then be plumbed out to the surrounding context to inform
 * the expected blocks the template in question expects to receive.
 */
declare const ModuleDocs: void;

/** The loose shape of the expected return type for a block body */
export type BlockResult = IterableIterator<BlockYield<string, unknown[]>>;

/**
 * A type that encapsulates the act of `{{yield}}`ing in a template, encoding
 * the name of the block that was yielded to and the type(s) of its param(s)
 */
export type BlockYield<K extends string, V extends unknown[]> = { to: K; values: V };

/**
 * Given a block function, determines its `BlockYield`s based on its returned
 * iterator type.
 */
export type YieldsFromBlock<T extends (...args: any) => BlockResult> = T extends (
  ...args: any
) => IterableIterator<infer U>
  ? U
  : never;

/**
 * Used in template bodies to encode a `{{yield}}` statement.
 *
 *     {{yield foo bar to='name'}}
 *
 * Is equivalent to:
 *
 *     yield toBlock('name', foo, bar);
 */
export declare function toBlock<K extends string, V extends unknown[]>(
  to: K,
  ...values: V
): BlockYield<K, V>;
