import Component from '@glimmer/component';

export interface GreetingSignature {
  Args: {
    /** Who to greet */
    target: string;
  };
}

/** A simple greeting component. */
export default class Greeting extends Component<GreetingSignature> {
  private message = 'Hello';

  <template>
    {{this.message}}, {{@target}}!
  </template>
}
