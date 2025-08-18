import Component from '@glimmer/component';
import Colocated from './colocated-folder';
import Greeting from './GreetingUntyped';

export default class Other extends Component {
  message = 'Hello';

  <template>
    <Greeting @target="World" />
    <Colocated @target="World" />
  </template>
}
