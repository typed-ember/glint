import Component, { ArgsFor } from '@glint/environment-ember-loose/ember-component';

export interface EmberComponentSignature {
  Element: HTMLDivElement;
  Args: {
    required: string;
    hasDefault?: string;
    optional?: number;
  };
}

export default interface EmberComponent extends ArgsFor<EmberComponentSignature> {}
export default class EmberComponent extends Component<EmberComponentSignature> {
  public hasDefault = 'defaultValue';

  public checkTypes(): unknown {
    const required: string = this.required;
    const hasDefault: string = this.hasDefault;
    const optional: number | undefined = this.optional;

    return { required, hasDefault, optional };
  }
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    EmberComponent: typeof EmberComponent;
    'ember-component': typeof EmberComponent;
  }
}
