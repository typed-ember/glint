import Component from '@glimmer/component';
import Bang from './Bang';
import { shout } from './utils';

export interface GreetingSignature {
  Args: { target: string };
}

export default class Greeting extends Component<GreetingSignature> {
  get message(): string {
    return shout('hello');
  }

  <template>
    {{this.message}}, {{@target}}<Bang @times={{3}} />
  </template>
}
