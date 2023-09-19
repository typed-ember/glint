import Component from '@glimmer/component';
import { TOC } from '@ember/component/template-only';
import repeat from '../helpers/repeat';

export interface GreetingSignature {
  Args: { target: string };
}

export default class Greeting extends Component<GreetingSignature> {
  private message = 'Hello';

  <template>
    {{this.message}}, {{@target}}<Bang @times={{3}} />
  </template>
}

const Bang: TOC<{ Args: { times: number } }> = <template>
  {{repeat '!' @times}}
</template>

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    Greeting: typeof Greeting;
  }
}
