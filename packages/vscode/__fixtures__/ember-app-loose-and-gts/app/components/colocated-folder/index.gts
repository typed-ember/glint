import Component from '@glimmer/component';

export interface ColocatedIndexSignature {
  Args: { target: string };
}

export default class ColocatedIndex extends Component<ColocatedIndexSignature> {
  private message = 'Hello';

  <template>
    {{this.message}}, {{@target}}!
  </template>
}
