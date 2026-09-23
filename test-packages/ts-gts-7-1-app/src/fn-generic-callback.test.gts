import Component from '@glimmer/component';
import { fn } from '@ember/helper';

// Regression guard for https://github.com/typed-ember/glint/issues/1247
//
// `{{fn}}` with a callback whose type parameters depend on each other only
// type-checks when the `fn` call has its slot's contextual type: TypeScript
// infers `V` from the expected `(value: Person['name']) => void`. Emitting
// `fn` as a `(fn(...), bindPositional(...))` comma pair everywhere (#1189)
// left the validating call without a contextual type, so `V` fell back to
// `string | number` and valid code was rejected.

interface Person {
  name: string;
  age: number;
}

class Field<M, K extends keyof M> extends Component<{
  Args: { model: M; field: K; onChange: (value: M[K]) => void };
}> {}

export default class Form extends Component {
  person: Person = { name: 'Tomster', age: 13 };

  update = <K extends keyof Person, V extends Person[K]>(key: K, value: V) => {
    console.log(key, value);
  };

  setAge = (value: number) => {
    console.log(value);
  };

  <template>
    <Field @model={{this.person}} @field="name" @onChange={{fn this.update "name"}} />

    {{! A genuinely mismatched callback is still rejected. }}
    {{! @glint-expect-error }}
    <Field @model={{this.person}} @field="name" @onChange={{fn this.setAge}} />
  </template>
}
