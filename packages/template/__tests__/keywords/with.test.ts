import { expectTypeOf } from 'expect-type';
import { emitComponent, bindBlocks, resolve } from '../../-private/dsl';
import { WithKeyword } from '../../-private/keywords';

const withKeyword = resolve({} as WithKeyword);

// Yields out the given value
emitComponent(withKeyword({}, 'hello'), (component) => {
  bindBlocks(component.blockParams, {
    default(str) {
      expectTypeOf(str).toEqualTypeOf<string>();
    },
    inverse() {
      // Nothing
    },
  });
});

// @ts-expect-error: Rejects multiple values
withKeyword({}, 'hello', 'goodbye');
