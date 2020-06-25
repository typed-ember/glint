import Component, { hbs } from '@glimmerx/component';

import logo from './logo.svg';
import './App.css';

export default class App extends Component {
  logo = logo;

  static template = hbs`
    <div id="intro">
      <img src={{this.logo}}/>

      <h1>hello, glimmerx!</h1>
      <h3>
        you can get started by editing <code>src/App.js</code>,
        and run tests by visiting <a href="./tests">/tests</a>
      </h3>
    </div>
  `;
}
