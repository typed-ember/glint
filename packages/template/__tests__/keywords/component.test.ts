import { expectTypeOf } from 'expect-type';
import { resolve, invokeBlock } from '@glint/template';
import { AcceptsBlocks } from '@glint/template/-private';
import { ComponentKeyword } from '@glint/template/-private/keywords';

const componentKeyword = resolve({} as ComponentKeyword);

declare const TestComponent: (args: {
  value: string;
}) => AcceptsBlocks<{
  default?: [string];
  inverse?: [];
}>;

const NoopCurriedTestComponent = componentKeyword({}, TestComponent);
const ValueCurriedTestComponent = componentKeyword({ value: 'hello' }, TestComponent);

// Invoking the noop-curried component
invokeBlock(resolve(NoopCurriedTestComponent)({ value: 'hello' }), {});

// @ts-expect-error: Invoking the curried component but forgetting `value`
resolve(NoopCurriedTestComponent)({});

// @ts-expect-error: Invoking the curried component with an invalid value
resolve(NoopCurriedTestComponent)({ value: 123 });

// Invoking the noop-curried component with a valid block
invokeBlock(resolve(NoopCurriedTestComponent)({ value: 'hello' }), {
  default(...args) {
    expectTypeOf(args).toEqualTypeOf<[string]>();
  },
});

// Invoking the noop-curried component with an invalid block
invokeBlock(resolve(NoopCurriedTestComponent)({ value: 'hello' }), {
  default() {
    /* nothing */
  },
  // @ts-expect-error
  asdf() {
    /* nothing */
  },
});

// Invoking the curried-with-value component with no value
invokeBlock(resolve(ValueCurriedTestComponent)({}), {});

// Invoking the curried-with-value component with a valid value
invokeBlock(resolve(ValueCurriedTestComponent)({ value: 'hi' }), {});

// @ts-expect-error: Invoking the curred-with-value component with an invalid value
invokeBlock(resolve(ValueCurriedTestComponent)({ value: 123 }), {});

// @ts-expect-error: Attempting to curry a nonexistent arg
componentKeyword({ foo: true }, TestComponent);

// @ts-expect-error: Attempting to curry an arg with the wrong type
componentKeyword({ value: 123 }, TestComponent);
