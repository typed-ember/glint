import Component from '@glimmer/component';

export interface Signature {
  Args: { target: string };
}

export default class CharacterTesting extends Component<Signature> {
  $message = 'Hello';

  <template>
    {{this.$message}}
  </template>
}
