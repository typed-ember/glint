/*
 * This module contains types pertaining to defining and working with
 * yields and blocks in templates. Components define the names of the
 * blocks they intend to yield to, as well as the types of their block
 * parameters, as string => tuple record:
 *
 *    interface MyComponentYields {
 *      header?: [];
 *      body: [message: string];
 *    }
 *
 * In general, a block body is represented as a callback passed in to
 * an `invokeBlock` call. For example, in an invocation like this:
 *
 *     invokeBlock(resolve(Globals['each'])({}, ['a', 'b', 'c']), {
 *       default(letter, index) {
 *         yieldToBlock(𝚪, 'body', `Letter #${index}: ${letter}`);
 *       }
 *     })
 *
 * A `default` block is being passed to the `each` helper, which determines
 * that the types of the params it receives are a `string` and a `number`.
 *
 * The caller then uses those parameters to yield out to its own `body` block,
 * which is validated against the declared blocks and their parameter types
 * defined in the context for the containing component, `𝚪`.
 */

import { AnyBlocks } from './signature';
import { TemplateContext } from './template';

/**
 * Given a mapping from block names to the parameters they'll receive, produces
 * the corresponding type for the blocks hash that may be passed to the component
 * in question.
 */
export type BlockBodies<Yields extends AnyBlocks> = {
  [BlockName in keyof Yields]: (...params: NonNullable<Yields[BlockName]>) => void;
};

/**
 * Used in template bodies to encode a `{{yield}}` statement.
 *
 *     {{yield foo bar to='name'}}
 *
 * Is equivalent to:
 *
 *     yieldToBlock(𝚪, 'name', foo, bar);
 */
export declare function yieldToBlock<
  Context extends TemplateContext<any, any, any>,
  K extends keyof Context['yields']
>(𝚪: Context, to: K, ...values: NonNullable<Context['yields'][K]>): void;
