import { Component, helper } from '@glint/environment-glimmerx';
import { hbs } from '@glimmerx/component';

const or = helper(<T, U>([a, b]: [T, U]) => a || b);

export interface GreetingHeaderSignature {
  Args: {
    greeting: string;
    target?: string;
  };
}

export default class GreetingHeader extends Component<GreetingHeaderSignature> {
  public static template = hbs`
    <h1>{{@greeting}}, {{or @target 'glimmerx'}}</h1>
  `;
}
