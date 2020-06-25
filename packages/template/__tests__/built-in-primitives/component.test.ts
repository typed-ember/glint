import { expectTypeOf } from 'expect-type';
import { resolve, BuiltIns, toBlock, invokeInline, invokeBlock } from '@glint/template';
import { AcceptsBlocks } from '@glint/template/-private/signature';
import { BlockResult, BlockYield } from '@glint/template/-private/blocks';
import { Invokable } from '@glint/template/-private/invoke';

const component = resolve(BuiltIns['component']);

declare const TestComponent: Invokable<(args: {
  value: string;
}) => AcceptsBlocks<{
  default?(arg: string): BlockResult;
  inverse?(): BlockResult;
}>>;

const NoopCurriedTestComponent = invokeInline(component({}, TestComponent));
const ValueCurriedTestComponent = invokeInline(component({ value: 'hello' }, TestComponent));

// Invoking the noop-curried component
expectTypeOf(invokeBlock(resolve(NoopCurriedTestComponent)({ value: 'hello' }), {})).toEqualTypeOf<
  never
>();

// @ts-expect-error: Invoking the curried component but forgetting `value`
resolve(NoopCurriedTestComponent)({});

// @ts-expect-error: Invoking the curried component with an invalid value
resolve(NoopCurriedTestComponent)({ value: 123 });

// Invoking the noop-curried component with a valid block
expectTypeOf(
  invokeBlock(resolve(NoopCurriedTestComponent)({ value: 'hello' }), {
    *default(...args) {
      expectTypeOf(args).toEqualTypeOf<[string]>();
      yield toBlock('body', args[0]);
    },
  })
).toEqualTypeOf<BlockYield<'body', [string]>>();

// Invoking the noop-curried component with an invalid block
invokeBlock(
  resolve(NoopCurriedTestComponent)({ value: 'hello' }),
  {
    *default() {
      /* nothing */
    },
    // @ts-expect-error
    *asdf() {
      /* nothing */
    },
  },
  'default',
  'asdf'
);

// Invoking the curried-with-value component with no value
expectTypeOf(invokeBlock(resolve(ValueCurriedTestComponent)({}), {})).toEqualTypeOf<never>();

// Invoking the curried-with-value component with a valid value
expectTypeOf(invokeBlock(resolve(ValueCurriedTestComponent)({ value: 'hi' }), {})).toEqualTypeOf<
  never
>();

// @ts-expect-error: Invoking the curred-with-value component with an invalid value
invokeBlock(resolve(ValueCurriedTestComponent)({ value: 123 }), {});

// @ts-expect-error: Attempting to curry a nonexistent arg
component({ foo: true }, TestComponent);

// @ts-expect-error: Attempting to curry an arg with the wrong type
component({ value: 123 }, TestComponent);
