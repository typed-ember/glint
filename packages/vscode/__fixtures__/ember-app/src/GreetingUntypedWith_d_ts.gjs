// untyped

import Component from '@glimmer/component';

export default class Greeting extends Component {
  message = 'Hello';

  <template>
    {{this.message}}, {{@target}}<Bang @times={{3}} />
  </template>
}

function repeat(value, times) {
  return Array(times).fill(value).join('');
}

const Bang = <template>
  {{repeat '!' @times}}
</template>
