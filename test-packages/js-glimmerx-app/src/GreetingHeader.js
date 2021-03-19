import Component from '@glimmerx/component';
import { hbs } from '@glimmerx/component';
import { helper } from '@glimmerx/helper';

const or = helper(([a, b]) => a || b);

export default class GreetingHeader extends Component {
  static template = hbs`
    <h1>{{@greeting}}, {{or @target 'glimmerx'}}</h1>
    <img src={{this.src}}/>
  `;

  get src() {
    return this.args.src || 'https://picsum.photos/250';
  }
}
