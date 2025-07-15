/* eslint-disable ember/no-classic-components, ember/require-tagless-components */
import Component from '@ember/component';

// Not sure why this is needed but something about the test package setup is failing to full import this.
import '@glint/environment-ember-loose/-private/dsl/integration-declarations';

export interface EmberComponentArgs {
  required: string;
  hasDefault?: string;
  optional?: number;
}

export interface EmberComponentSignature {
  Element: HTMLDivElement;
  Args: EmberComponentArgs;
}

export default interface EmberComponent extends EmberComponentArgs {}
export default class EmberComponent extends Component<EmberComponentSignature> {
  public hasDefault = 'defaultValue';
  public showFunctionHelpers = false;

  public isLongString(value: string): boolean {
    return value.length > 5;
  }

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
