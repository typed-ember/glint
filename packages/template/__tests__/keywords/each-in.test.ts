import { expectTypeOf } from 'expect-type';
import { resolve, Globals, toBlock, invokeBlock } from '@glint/template';
import { BlockYield } from '@glint/template/-private/blocks';

const eachIn = resolve(Globals['each-in']);

// Yield out key/value pairs from the given input
expectTypeOf(
  invokeBlock(eachIn({}, { foo: 'hello' }), {
    *default(key, value) {
      // expect-type doesn't handle constrained type parameters well, but we
      // can at least ensure they're assignable to the right type
      let localKey: 'foo' = key;
      let localValue: string = value;

      // @ts-expect-error: `key` should extend 'foo'
      let badLocalKey: 'bar' = key;

      // @ts-expect-error: `value` should be a string
      let badLocalValue: number = value;

      console.log(badLocalKey, badLocalValue);

      yield toBlock('body', localKey, localValue.length);
    },
  })
).toEqualTypeOf<BlockYield<'body', ['foo', number]>>();
