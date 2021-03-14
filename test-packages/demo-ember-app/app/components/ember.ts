import Component, { ArgsFor } from '@glint/environment-ember-loose/ember-component';

export interface EmberSignature {
  Args: {
    required: string;
    hasDefault?: string;
    optional?: number;
  };
}

export default interface Ember extends ArgsFor<EmberSignature> {}
export default class Ember extends Component<EmberSignature> {
  public hasDefault = 'defaultValue';

  public checkTypes(): unknown {
    const required: string = this.required;
    const hasDefault: string = this.hasDefault;
    const optional: number | undefined = this.optional;

    return { required, hasDefault, optional };
  }
}
