import Component, { hbs, tracked } from '@glimmerx/component';
import { action } from '@glimmerx/modifier';
import './App.css';

import Carousel from './Carousel';

export default class App extends Component {
  @tracked count = 1;

  @action increment() {
    this.count++;
  }

  static template = hbs`
    <h1>Welcome to the untyped JS GlimmerX demo app!</h1>
    <Carousel @title="My Awesome Carousel"/>
  `;
}
