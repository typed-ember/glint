import Component, { hbs } from '@glimmerx/component';
import { helper } from '@glimmerx/helper';

import logo from './logo.svg';
import './App.css';

export default class App extends Component {
  private logo = logo;

  public static template = hbs`
    <div id="intro">
      <img src={{this.logo}}/>

      <GreetingHeader @greeting="hello" @target="glint" />
      <h3>
        you can get started by editing <code>src/App.js</code>,
        and run tests by visiting <a href="./tests">/tests</a>
      </h3>
    </div>
  `;
}

const or = helper(<T, U>([a, b]: [T, U]) => a || b);

interface GreetingHeaderArgs {
  greeting: string;
  target?: string;
}

class GreetingHeader extends Component<GreetingHeaderArgs> {
  public static template = hbs`

    <h1>{{@greeting}}, {{or @target 'glimmerx'}}</h1>
  `;
}
