import Component, { hbs, tracked } from '@glimmerx/component';
import { on, action } from '@glimmerx/modifier';

import './App.css';
import GreetingHeader from './GreetingHeader';

function formatName(name) {
  return `${name} the Great and Powerful`;
}

class FormattedName extends Component {
  static template = hbs`
    {{formatName this.args.name}}!
  `;

  get name() {
    return this.args.name || 'glimmerx';
  }
}

const I_AM_CONSTANT = 'and I am a constant';
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

class IncrementableButton extends Component {
  @tracked count = this.args.startCount;

  @action increment() {
    this.count++;
  }

  static template = hbs`
    <p>You have clicked the button {{this.count}} times.</p>
    <button {{on "click" this.increment}}>Click</button>
  `;
}
