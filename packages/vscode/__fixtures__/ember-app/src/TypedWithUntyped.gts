import Greeting from './GreetingUntyped';
import Component from '@glimmer/component';


export default class Other extends Component {
  message = 'Hello';

  <template>
    <Greeting @target="World" data-test-whatever data-test="value" />
    {{! @glint-expect-error not imported}}
    <Colocated @target="World" />
  </template>
}