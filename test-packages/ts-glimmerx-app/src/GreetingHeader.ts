import Component, { hbs } from '@glimmerx/component';
import { helper } from '@glimmerx/helper';
import type { WithBoundArgs } from '@glint/template';

const or = helper(<T, U>([a, b]: [T, U]) => a || b);

export interface GreetingHeaderSignature {
  Args: {
    greeting: WithBoundArgs<typeof TestingComponentHelper, 'name'>;
    target?: string;
  };
}

export default class GreetingHeader extends Component<GreetingHeaderSignature> {
  public static template = hbs`
    <h1>{{@greeting}}, welcome to {{or @target 'glimmerx'}}</h1>
  `;
}

export class TestingComponentHelper extends Component<{ Args: { name: string } }> {
  static template = hbs`hello {{@name}}`;
}
