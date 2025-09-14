import Component from '@glimmer/component';

interface ElementlessComponentSignature {
}

class ElementlessComponent extends Component<ElementlessComponentSignature> {
  <template>
    <div>ElementlessComponent</div>
  </template>
}

interface ElementedComponentSignature {
  Element: HTMLDivElement;
}

class ElementedComponent extends Component<ElementedComponentSignature> {
  <template>
    <div>ElementedComponent</div>
  </template>
}

export default class AttributesTest extends Component {
  private message = 'Hello';

  <template>
    <ElementlessComponent class="bar" />
    <ElementedComponent foo="bar" />
  </template>
}
