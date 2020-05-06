import { expectType, expectError } from 'tsd';
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
expectType<never>(invokeBlock(resolve(NoopCurriedTestComponent)({ value: 'hello' }), {}));

// Invoking the curried component but forgetting `value`
expectError(resolve(NoopCurriedTestComponent)({}));

// Invoking the curried component with an invalid value
expectError(resolve(NoopCurriedTestComponent)({ value: 123 }));

// Invoking the noop-curried component with a valid block
expectType<BlockYield<'body', [string]>>(
  invokeBlock(resolve(NoopCurriedTestComponent)({ value: 'hello' }), {
    *default(...args) {
      expectType<[string]>(args);
      yield toBlock('body', args[0]);
    },
  })
);

// Invoking the noop-curried component with an invalid block
expectError(
  invokeBlock(
    resolve(NoopCurriedTestComponent)({ value: 'hello' }),
    {
      *default() {
        /* nothing */
      },
      *asdf() {
        /* nothing */
      },
    },
    'default',
    'asdf'
  )
);

// Invoking the curried-with-value component with no value
expectType<never>(invokeBlock(resolve(ValueCurriedTestComponent)({}), {}));

// Invoking the curried-with-value component with a valid value
expectType<never>(invokeBlock(resolve(ValueCurriedTestComponent)({ value: 'hi' }), {}));

// Invoking the curred-with-value component with an invalid value
expectError(invokeBlock(resolve(ValueCurriedTestComponent)({ value: 123 }), {}));

// Attempting to curry a nonexistent arg
expectError(component({ foo: true }, TestComponent));

// Attempting to curry an arg with the wrong type
expectError(component({ value: 123 }, TestComponent));
