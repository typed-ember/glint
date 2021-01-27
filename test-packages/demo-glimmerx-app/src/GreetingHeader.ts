import Component, { hbs } from '@glimmerx/component';
import { helper } from '@glimmerx/helper';

const or = helper(<T, U>([a, b]: [T, U]) => a || b);

export interface GreetingHeaderArgs {
  greeting: string;
  target?: string;
}

export default class GreetingHeader extends Component<GreetingHeaderArgs> {
  public static template = hbs`
    <h1>{{@greeting}}, {{or @target 'glimmerx'}}</h1>
  `;
}
