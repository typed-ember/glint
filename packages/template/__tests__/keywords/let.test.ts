import { expectTypeOf } from 'expect-type';
import { emitComponent, bindBlocks, resolve } from '../../-private/dsl';
import { LetKeyword } from '../../-private/keywords';

const letKeyword = resolve({} as LetKeyword);

// Yields out the given values
emitComponent(letKeyword({}, 'hello', 123), (component) => {
  bindBlocks(component.blockParams, {
    default(str, num) {
      expectTypeOf(str).toEqualTypeOf<string>();
      expectTypeOf(num).toEqualTypeOf<number>();
    },
  });
});
