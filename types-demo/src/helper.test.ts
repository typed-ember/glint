import Helper, { helper } from '@ember/component/helper';
import { Invokable, invokeInline } from '@glint/template/-private/invoke';
import { ReturnsValue, NoNamedArgs } from '@glint/template/-private/signature';
import { resolve } from '@glint/template';
import { expectType, expectError } from 'tsd';

declare module '@ember/component/helper' {
  export function helper<T, Positional extends unknown[], Args = NoNamedArgs>(
    f: (positional: Positional, named: Args) => T
  ): Invokable<(args: Args, ...positional: Positional) => ReturnsValue<T>>;
}

// Type parameters can be persisted for functional helpers
const id = resolve(helper(<T>([value]: [T]) => value));

// For class-based, unfortunately, they can't, because there's an intervening object type
const hello = resolve(
  class HelloHelper extends Helper {
    compute(_: [], { target }: { target: string }): string {
      return `Hello, ${target}`;
    }
  }
);

// Correct parametrized type for a functional helper
expectType<string>(invokeInline(id({}, 'hello')));
expectType<number>(invokeInline(id({}, 123)));

// Correct type for a class-based helper
expectType<string>(invokeInline(hello({ target: 'world' })));

// Missing positional param
expectError(invokeInline(id({})));

// Invalid named param
expectError(invokeInline(hello({ target: 'world', foo: true })));

// Named param when none are expected
expectError(invokeInline(id({ key: 'value' }, 'hello')));
