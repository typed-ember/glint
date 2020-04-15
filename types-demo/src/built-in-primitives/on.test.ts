import { resolve, BuiltIns, invokeModifier } from '@gleam/core';
import { expectType } from 'tsd';

const on = resolve(BuiltIns['on']);

expectType<void>(
  invokeModifier(
    on({}, 'keydown', (event) => {
      expectType<KeyboardEvent>(event);
    })
  )
);
