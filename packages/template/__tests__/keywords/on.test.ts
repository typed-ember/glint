import { resolve, Globals, invokeModifier } from '@glint/template';
import { expectTypeOf } from 'expect-type';

const on = resolve(Globals['on']);

expectTypeOf(
  invokeModifier(
    on({}, 'keydown', (event) => {
      expectTypeOf(event).toEqualTypeOf<KeyboardEvent>();
    })
  )
).toEqualTypeOf<void>();
