import { Component } from '@glint/environment-glimmerx';
import { hbs } from '@glimmerx/component';

import logo from './logo.svg';
import './App.css';
import GreetingHeader from './GreetingHeader';

export default class App extends Component {
  private logo = logo;

  public static template = hbs`
    <div id="intro">
      <img src={{this.logo}}/>

      <GreetingHeader @greeting="hello" @target="glint" />

      <SubHeader>
        you can get started by editing <code>src/App.js</code>,
        and run tests by visiting <a href="./tests">/tests</a>
      </SubHeader>
    </div>
  `;
}

class SubHeader extends Component<{ Yields: { default: [] } }> {
  public static template = hbs`
    <h3>{{yield}}</h3>
  `;
}
