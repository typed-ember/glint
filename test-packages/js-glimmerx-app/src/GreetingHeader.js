import Component from '@glint/environment-glimmerx/component';
import { hbs } from '@glimmerx/component';
import { helper } from '@glint/environment-glimmerx/helper';

const or = helper(
  /** @param {[a: *, b: *]} param */
  ([a, b]) => a || b
);

/**
 * @typedef GreetingHeaderSignature
 * @property {object} Args
 * @property {string} Args.greeting A really polite greeting (hopefully)
 * @property {string} [Args.src] A really nice photo
 * @property {string} [Args.target] Indicates who the greeting is for
 */

/** @extends {Component<GreetingHeaderSignature>} */
export default class GreetingHeader extends Component {
  static template = hbs`
    <h1>{{@greeting}}, {{or @target 'glimmerx'}}</h1>
    <img src={{this.src}}/>
    {{@age}}
    {{@onion}}
  `;

  get src() {
    return this.args.src || 'https://picsum.photos/250';
  }
}
