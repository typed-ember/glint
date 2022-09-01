import Component, { TemplateComponent as TC, hbs } from '@glimmerx/component';

import logo from './logo.svg';
import './App.css';
import GreetingHeader, { TestingComponentHelper } from './GreetingHeader';

export default class App extends Component {
  private logo = logo;
  private letters = ['a', 'b', 'c'];

  public static template = hbs`
    <div id="intro">
      {{t "DOESNT EXIST"}}
      <img src={{this.logo}}/>

      <GreetingHeader @target="glint" @greeting={{component TestingComponentHelper name="chris"}}/>

      <SubHeader>
        you can get started by editing <code>src/App.js</code>,
        and run tests by visiting <a href="./tests">/tests</a>
      </SubHeader>

      Some letters:
      <List @items={{this.letters}} as |item|>
        {{item}}
      </List>
    </div>
  `;
}

interface SubHeaderSignature {
  Blocks: { default: [] };
}

const SubHeader: TC<SubHeaderSignature> = hbs`
  <h3>{{yield}}</h3>
`;

interface ListSignature<T> {
  Args: {
    items: Array<T>;
  };
  Blocks: {
    default: [item: T];
  };
}

class List<T> extends Component<ListSignature<T>> {
  public static template = hbs`
    <ol>
      {{#each @items as |item|}}
        <li>{{yield item}}</li>
      {{/each}}
    </ol>
  `;
}
