import Helper from '@ember/component/helper';
import { hbs } from 'ember-cli-htmlbars';
import { typeTest } from '@glint/type-test';
class GreetHelper extends Helper {
}
// Simple no-op binding
typeTest({ greet: GreetHelper }, hbs `
    {{#let (helper this.greet) as |noopGreet|}}
      {{@expectTypeOf (noopGreet "Hello" target="World") @to.beString}}

      {{! @glint-expect-error: missing positional arg }}
      {{noopGreet target="World"}}

      {{! @glint-expect-error: missing positional arg }}
      {{noopGreet "Hello"}}
    {{/let}}
  `);
// Currying a positional arg
typeTest({ greet: GreetHelper }, hbs `
    {{#let (helper this.greet "Hello") as |boundGreet|}}
      {{boundGreet target="World"}}

      {{! @glint-expect-error: the positional arg is already curried }}
      {{boundGreet "Hello" target="World"}}

      {{! @glint-expect-error: missing required named arg}}
      {{boundGreet}}
    {{/let}}
  `);
// Currying a named arg
typeTest({ greet: GreetHelper }, hbs `
    {{#let (helper this.greet target="World") as |boundGreet|}}
      {{boundGreet "Hello"}}

      {{boundGreet "Hello" target="World"}}

      {{! @glint-expect-error: missing required positional arg}}
      {{boundGreet target="World"}}
    {{/let}}
  `);
// Double-currying
typeTest({ greet: GreetHelper }, hbs `
    {{#let (helper (helper this.greet "Hello") target="World") as |posThenNamed|}}
      {{#let (helper (helper this.greet target="World") "Hello") as |namedThenPos|}}
        {{@expectTypeOf posThenNamed @to.equalTypeOf namedThenPos}}
      {{/let}}  
    {{/let}}  
  `);
class MakeArrayPositional extends Helper {
}
// No-op currying
typeTest({ makeArray: MakeArrayPositional }, hbs `
    {{#let (helper this.makeArray) as |noopMakeArray|}}
      {{@expectTypeOf (noopMakeArray "hi") @to.equalTypeOf (array "ok")}}
      {{@expectTypeOf (noopMakeArray (array "hi")) @to.equalTypeOf (array "ok")}}
      
      {{@expectTypeOf (noopMakeArray 12) @to.equalTypeOf (array 1)}}
      {{@expectTypeOf (noopMakeArray (array 12)) @to.equalTypeOf (array 1)}}

      {{! @glint-expect-error: missing required arg }}
      {{log (noopMakeArray)}}
    {{/let}}
  `);
// Currying positional generic args MUST pre-fix the type parameter,
// otherwise TypeScript can't tell whether the generic might actually
// represent named args.
typeTest({ makeArray: (MakeArrayPositional) }, hbs `
    {{#let (helper this.makeArray 123) as |makeNumberArray|}}
      {{@expectTypeOf (makeNumberArray) @to.equalTypeOf (array 123)}}
    {{/let}}
  `);
class MakeArrayNamed extends Helper {
}
// No-op currying
typeTest({ makeArray: MakeArrayNamed }, hbs `
    {{#let (helper this.makeArray) as |noopMakeArray|}}
      {{@expectTypeOf (noopMakeArray value="hi") @to.equalTypeOf (array "ok")}}
      {{@expectTypeOf (noopMakeArray value=(array "hi")) @to.equalTypeOf (array "ok")}}
      
      {{@expectTypeOf (noopMakeArray value=12) @to.equalTypeOf (array 1)}}
      {{@expectTypeOf (noopMakeArray value=(array 12)) @to.equalTypeOf (array 1)}}

      {{! @glint-expect-error: missing required arg }}
      {{log (noopMakeArray)}}
    {{/let}}
  `);
// Currying named generic args doesn't require pre-specifying the type
typeTest({ makeArray: MakeArrayNamed }, hbs `
    {{#let (helper this.makeArray value=123) as |makeNumberArray|}}
      {{@expectTypeOf (makeNumberArray) @to.equalTypeOf (array 123)}}
    {{/let}}
  `);
// Prebinding args at different locations
typeTest({
    myriad: class MyriadPositionals extends Helper {
    },
}, hbs `
    {{this.myriad "one" true 3}}
    
    {{(helper this.myriad "one" true 3)}}
    {{(helper this.myriad "one" true) 3}}
    {{(helper this.myriad "one") true 3}}
    {{(helper this.myriad) "one" true 3}}

    {{! @glint-expect-error: missing arg }}
    {{(helper this.myriad "one" true)}}

    {{! @glint-expect-error: extra arg }}
    {{(helper this.myriad "one" true 3) "four"}}
  `);
//# sourceMappingURL=helper.test.js.map