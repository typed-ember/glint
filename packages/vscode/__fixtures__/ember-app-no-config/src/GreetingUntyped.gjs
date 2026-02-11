import Component from '@glimmer/component';

export default class Greeting extends Component {
  message = 'Hello';

  <template>
    {{this.message}}, {{@target}}!
  </template>
}
