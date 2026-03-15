import Helper from '@ember/component/helper';
import { expectTypeOf, to } from '@glint/type-test';
import { array } from '@ember/helper';

class GreetHelper extends Helper<{
  Args: {
    Positional: [greeting: string];
    Named: { target: string };
  };
  Return: string;
}> {}

// Simple no-op binding
const NoopBindingTest = <template>
  {{#let (helper GreetHelper) as |noopGreet|}}
    {{expectTypeOf (noopGreet "Hello" target="World") to.beString}}

    {{! @glint-expect-error: missing positional arg }}
    {{noopGreet target="World"}}

    {{! @glint-expect-error: missing named arg }}
    {{noopGreet "Hello"}}
  {{/let}}
</template>;

// Currying a positional arg
const CurriedPositionalTest = <template>
  {{#let (helper GreetHelper "Hello") as |boundGreet|}}
    {{boundGreet target="World"}}

    {{! @glint-expect-error: the positional arg is already curried }}
    {{boundGreet "Hello" target="World"}}

    {{! @glint-expect-error: missing required named arg }}
    {{boundGreet}}
  {{/let}}
</template>;

// Currying a named arg
const CurriedNamedTest = <template>
  {{#let (helper GreetHelper target="World") as |boundGreet|}}
    {{boundGreet "Hello"}}
    {{boundGreet "Hello" target="World"}}

    {{! @glint-expect-error: missing required positional arg }}
    {{boundGreet target="World"}}
  {{/let}}
</template>;

// Double-currying
const DoubleCurryTest = <template>
  {{#let (helper (helper GreetHelper "Hello") target="World") as |posThenNamed|}}
    {{#let (helper (helper GreetHelper target="World") "Hello") as |namedThenPos|}}
      {{expectTypeOf posThenNamed to.equalTypeOf namedThenPos}}
    {{/let}}
  {{/let}}
</template>;

class MakeArrayPositional<T> extends Helper<{
  Args: { Positional: [value: T | Array<T>] };
  Return: Array<T>;
}> {}

// No-op currying with generics
const NoopGenericTest = <template>
  {{#let (helper MakeArrayPositional) as |noopMakeArray|}}
    {{expectTypeOf (noopMakeArray "hi") to.equalTypeOf (array "ok")}}
    {{expectTypeOf (noopMakeArray (array "hi")) to.equalTypeOf (array "ok")}}

    {{expectTypeOf (noopMakeArray 12) to.equalTypeOf (array 1)}}
    {{expectTypeOf (noopMakeArray (array 12)) to.equalTypeOf (array 1)}}

    {{! @glint-expect-error: missing required arg }}
    {{log (noopMakeArray)}}
  {{/let}}
</template>;

// Currying positional generic args MUST pre-fix the type parameter
{
  const BoundMakeArray = MakeArrayPositional<number>;

  const CurriedGenericPosTest = <template>
    {{#let (helper BoundMakeArray 123) as |makeNumberArray|}}
      {{expectTypeOf (makeNumberArray) to.equalTypeOf (array 123)}}
    {{/let}}
  </template>;
}

class MakeArrayNamed<T> extends Helper<{
  Args: { Named: { value: T | Array<T> } };
  Return: Array<T>;
}> {}

// No-op currying with named generic args
const NoopGenericNamedTest = <template>
  {{#let (helper MakeArrayNamed) as |noopMakeArray|}}
    {{expectTypeOf (noopMakeArray value="hi") to.equalTypeOf (array "ok")}}
    {{expectTypeOf (noopMakeArray value=(array "hi")) to.equalTypeOf (array "ok")}}

    {{expectTypeOf (noopMakeArray value=12) to.equalTypeOf (array 1)}}
    {{expectTypeOf (noopMakeArray value=(array 12)) to.equalTypeOf (array 1)}}

    {{! @glint-expect-error: missing required arg }}
    {{log (noopMakeArray)}}
  {{/let}}
</template>;

// TODO: Currying named generic args — T erased through currying in .gts
// {{#let (helper MakeArrayNamed value=123) as |makeNumberArray|}} should
// infer T=number but gets unknown. Same generic erasure as #1068.

// Prebinding args at different locations
class MyriadPositionals extends Helper<{
  Args: { Positional: [string, boolean, number] };
  Return: string;
}> {}

const PrebindingTest = <template>
  {{MyriadPositionals "one" true 3}}

  {{(helper MyriadPositionals "one" true 3)}}
  {{(helper MyriadPositionals "one" true) 3}}
  {{(helper MyriadPositionals "one") true 3}}
  {{(helper MyriadPositionals) "one" true 3}}

  {{! @glint-expect-error: missing arg }}
  {{(helper MyriadPositionals "one" true)}}

  {{! @glint-expect-error: extra arg }}
  {{(helper MyriadPositionals "one" true 3) "four"}}
</template>;
