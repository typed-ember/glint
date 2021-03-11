import { GlimmerComponent } from '@glint/environment-ember-loose';

interface BarSignature {
  Args: {
    grault: number;
  };
}

export default class Bar extends GlimmerComponent<BarSignature> {
  name = 'BAR';
}
