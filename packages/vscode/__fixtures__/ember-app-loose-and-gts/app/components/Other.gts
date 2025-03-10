import Component from '@glimmer/component';
import Greeting from './Greeting.gts';
export interface OtherSignature {
  Args: { target: string };
}

export default class Other extends Component<OtherSignature> {
  private message = 'Hello';

  <template>
    <Greeting @target="World" />
  </template>
}
