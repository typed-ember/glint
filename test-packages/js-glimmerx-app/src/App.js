import Component, { hbs, tracked } from '@glimmerx/component';
import { on, action } from '@glimmerx/modifier';

import './App.css';
import GreetingHeader from './GreetingHeader';

/**
 * Formats a name to include "the Great and Powerful" afterwards. This is
 * a ridiculous helper!
 *
 * @param {string} name the name to format
 * @returns {string} the formatted name
 */
function formatName(name) {
  return `${name} the Great and Powerful`;
}

/**
 * @typedef FormattedNameSignature
 * @property {object} Args
 * @property {string} Args.name The name to be formatted
 */
/** @extends {Component<FormattedNameSignature>} */
class FormattedName extends Component {
  static template = hbs`
    {{formatName this.args.name}}!
  `;
}

const I_AM_CONSTANT = 'and I am a constant';

/**
 * @typedef ComponentAsArgSignature
 * @property {object} Args
 * @property {import('@glint/template').WithBoundArgs<typeof Component<FormattedNameSignature>, 'name'>} Args.title I really can't think of a good description
 */
/**
 * @type {import('@glimmerx/component').TemplateComponent<ComponentAsArgSignature>}
 */
const ComponentAsArg = hbs`
  <h1>I am {{@title}}</h1>
  {{I_AM_CONSTANT}}
`;

export default class HelloWorld extends Component {
  static template = hbs`
    <ComponentAsArg @title={{component FormattedName name="Oz"}}/>
    <GreetingHeader @greeting="hello"/>
    <IncrementableButton @startCount={{100}}/>
  `;
}

/**
 * @typedef IncrementableButtonSignature
 * @property {object} Args
 * @property {number} Args.startCount The count to start at
 */

/** @extends {Component<IncrementableButtonSignature>} */
class IncrementableButton extends Component {
  /** @type {number} the incrementable count */
  @tracked count = this.args.startCount;

  @action increment() {
    this.count++;
  }

  static template = hbs`
    <p>You have clicked the button {{this.count}} times.</p>
    <button {{on "click" this.increment}}>Click</button>
  `;
}
