import Component, { hbs } from '@glimmerx/component';

/**
 * @typedef SimpleComponentSignature
 * @property {object} Args
 * @property {string} Args.message
 */

/** @extends {Component<SimpleComponentSignature>} */
export default class SimpleComponent extends Component {
  static template = hbs`
    <p>This is my message: {{@message}}</p>
  `;
}
