import Component from '@glimmer/component';
import Colocated from './colocated-folder';
import Greeting from './GreetingUntyped';

export default class Other extends Component {
  message = 'Hello';

  @tracked foo;

  <template>
    <Greeting @target="World" data-test-whatever data-test="value" />
    <Colocated @target="World" />
  </template>
}
