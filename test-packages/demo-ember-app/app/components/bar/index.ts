import Component from '@glint/environment-ember-loose/glimmer-component';

interface BarSignature {
  Args: {
    grault: number;
  };
}

export default class Bar extends Component<BarSignature> {
  name = 'BAR';
}
