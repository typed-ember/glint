import { resolve, BuiltIns, invokeModifier } from '@glint/template';
import { expectTypeOf } from 'expect-type';

const on = resolve(BuiltIns['on']);

expectTypeOf(
  invokeModifier(
    on({}, 'keydown', (event) => {
      expectTypeOf(event).toEqualTypeOf<KeyboardEvent>();
    })
  )
).toEqualTypeOf<void>();
