import { typeTest } from '@glint/type-test';
import { hbs } from 'ember-cli-htmlbars';

let context = {
  string: 'foo',
  number: 123,
  boolean: true,
  symbol: Symbol(),
  any: null as any,
  unknown: null as unknown,
  never: null as never,
  null_: null,
  undefined_: undefined,
  hello: 'hello' as const,
};

typeTest(
  context,
  hbs`
    {{@expectTypeOf this.string @to.beString}}
    {{@expectTypeOf this.number @to.beNumber}}
    {{@expectTypeOf this.boolean @to.beBoolean}}
    {{@expectTypeOf this.symbol @to.beSymbol}}
    {{@expectTypeOf this.any @to.beAny}}
    {{@expectTypeOf this.unknown @to.beUnknown}}
    {{@expectTypeOf this.never @to.beNever}}
    {{@expectTypeOf this.null_ @to.beNull}}
    {{@expectTypeOf this.undefined_ @to.beUndefined}}

    {{@expectTypeOf 123 @to.equalTypeOf 456}}
    {{! @glint-expect-error: different types }}
    {{@expectTypeOf 123 @to.equalTypeOf 'hi'}}

    {{@expectTypeOf this.hello @to.beAssignableToTypeOf this.hello}}
    {{@expectTypeOf this.hello @to.beAssignableToTypeOf this.string}}
    {{! @glint-expect-error: string is not assignable to 'hello' }}
    {{@expectTypeOf this.string @to.beAssignableToTypeOf this.hello}}
  `,
);
