import Component from '@glimmer/component';

export interface GreetingSignature {
  Args: { target: string };
}

export default class Greeting extends Component<GreetingSignature> {
  private message = 'Hello';

  <template>
    {{this.message}}, {{@target}}!
  </template>
}
