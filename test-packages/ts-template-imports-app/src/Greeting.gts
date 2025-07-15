import Component from '@glimmer/component';
import type { TOC } from '@ember/component/template-only';

export interface GreetingSignature {
  Args: { target: string };
}

export default class Greeting extends Component<GreetingSignature> {
  private message = 'Hello';

  <template>
    {{this.message}}, {{@target}}<Bang @times={{3}} />
  </template>
}

function repeat(value: string, times: number): string {
  return Array(times).fill(value).join('');
}

const Bang: TOC<{ Args: { times: number } }> = <template>
  {{repeat '!' @times}}
</template>
