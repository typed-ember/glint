import Component from '@glimmer/component';

export interface GreetingSignature {
  Args: { target: string };
}

export default class Greeting extends Component<GreetingSignature> {
  private message = 'Hello';

  <template>
    {{this.message}},
    
    {{!@glint-expect-error this is suppressing a real error}}
    <NotAThing />
    
    {{!@glint-expect-error this is NOT a real error and should hence raise unused expect error diagnostic}}
    {{@target}}!
  </template>
}
