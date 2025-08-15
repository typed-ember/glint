import Component from '@glimmer/component';
import Greeting from './Greeting';
import Colocated from './colocated-folder';

export interface OtherSignature {
  Args: { target: string };
}

export default class Other extends Component<OtherSignature> {
  private message = 'Hello';

  <template>
    <Greeting @target="World" />
    <Colocated @target="World" />
  </template>
}
