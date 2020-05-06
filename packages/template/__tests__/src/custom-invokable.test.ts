import { expectType } from 'tsd';
import SumType from 'sums-up';
import { resolve, toBlock, invokeBlock } from '@glint/template';
import { AcceptsBlocks, NoNamedArgs } from '@glint/template/-private/signature';
import { BlockResult, BlockYield } from '@glint/template/-private/blocks';
import { Invokable } from '@glint/template/-private/invoke';

///////////////////////////////////////////////////////////////////////////////
// This module exercises what's possible when declaring a signature for a
// complex third-party (i.e. non-built-in) helper.
// Real-world, this is actually implemented via an AST transform to a series
// of conditionals and helper invocations that are efficient but not
// particularly ergonomic to write by hand.

class Maybe<T> extends SumType<{ Nothing: []; Just: [T] }> {}

const maybeValue = new Maybe<number>('Just', 123);

type SumVariants<T extends SumType<never>> = T extends SumType<infer V> ? V : never;

// Used to do pattern matching against sum type values using
// https://github.com/hojberg/sums-up
// It doesn't (can't) do exhaustiveness checking, but it does plumb through
// type parameters correctly, and
declare const caseOf: Invokable<<T extends SumType<never>>(
  args: NoNamedArgs,
  value: T
) => AcceptsBlocks<{
  default(
    when: Invokable<
      <K extends keyof SumVariants<T>>(
        args: NoNamedArgs,
        key: K
      ) => AcceptsBlocks<{
        default(...args: SumVariants<T>[K]): BlockResult;
        inverse?(): BlockResult;
      }>
    >
  ): BlockResult;
}>>;

/**
 * ```hbs
 * {{#case-of maybeValue as |when|}}
 *   {{#when 'Just' as |n|}}
 *     {{yield n}}
 *   {{else when 'Nothing'}}
 *     {{! nothin }}
 *   {{/when}}
 * {{/case-of}}
 * ```
 */
expectType<BlockYield<'default', [number]>>(
  invokeBlock(resolve(caseOf)({}, maybeValue), {
    *default(when) {
      yield invokeBlock(resolve(when)({}, 'Just'), {
        *default(n) {
          yield toBlock('default', n);
        },
        *inverse() {
          yield invokeBlock(resolve(when)({}, 'Nothing'), {
            *default() {
              /* nothin */
            },
          });
        },
      });
    },
  })
);

// Below is an alternative formulation using named block syntax.
// This is a bit weird as it's really a control structure and looks here
// more like it would emit DOM since it's using angle brackets, but
// you do get exhaustiveness checking with this approach (though it's
// arguable whether that's necessarily a good thing in template-land)

declare const CaseOf: Invokable<<T extends SumType<never>>(args: {
  value: T;
}) => AcceptsBlocks<
  {
    [K in keyof SumVariants<T>]: (...args: SumVariants<T>[K]) => BlockResult;
  }
>>;

/**
 * ```hbs
 * <CaseOf @value={{maybeValue}}>
 *   <:Just as |value|>
 *     {{yield value}}
 *   </:Just>
 *   <:Nothing>
 *     {{! nothin }}
 *   </:Nothing>
 * </CaseOf>
 * ```
 */
expectType<BlockYield<'default', [number]>>(
  invokeBlock(resolve(CaseOf)({ value: maybeValue }), {
    *Just(value) {
      yield toBlock('default', value);
    },
    *Nothing() {
      /* nothin */
    },
  })
);
