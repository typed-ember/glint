import Component, { hbs } from '@glimmerx/component';

import logo from './logo.svg';
import './App.css';
import GreetingHeader from './GreetingHeader';

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
