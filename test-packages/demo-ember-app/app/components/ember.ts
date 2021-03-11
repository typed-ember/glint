import { EmberComponent } from '@glint/environment-ember-loose';

export type EmberArgs = {
  required: string;
  hasDefault?: string;
  optional?: number;
};

export default interface Ember extends EmberArgs {}
export default class Ember extends EmberComponent<{ Args: EmberArgs }> {
  public hasDefault = 'defaultValue';

  public checkTypes(): unknown {
    const required: string = this.required;
    const hasDefault: string = this.hasDefault;
    const optional: number | undefined = this.optional;

    return { required, hasDefault, optional };
  }
}
