import Component from '@glimmer/component';
import { TOC } from '@ember/component/template-only';
import { hbs } from 'ember-template-imports';

const Hello: TOC<{ Args: { name: string } }> = hbs`
  <p>Hello, {{@name}}</p>
`;

export interface GreetingSignature {
  Args: { target: string };
}

export default class Greeting extends Component<GreetingSignature> {
  private message = 'Hello';

  <template>
    {{this.message}}, {{@target}}<Bang @times={{3}} /> <Hello @name={{@target}} />
  </template>
}

function repeat(value: string, times: number): string {
  return Array(times).fill(value).join('');
}

const Bang: TOC<{ Args: { times: number } }> = <template>
  {{repeat '!' @times}}
</template>
