import { helper } from '@glint/environment-ember-loose/ember-component/helper';

function repeat(params: [string, number] /*, hash*/) {
  return params[0].repeat(params[1]);
}

const repeatHelper = helper(repeat);

export default repeatHelper;

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    repeat: typeof repeatHelper;
  }
}
