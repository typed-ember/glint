import Component from '@glimmer/component';

interface ElementlessComponentSignature {}

class ElementlessComponent extends Component<ElementlessComponentSignature> {
  static {
    (({}) as typeof import('@glint/core/-private/dsl')).templateForBackingValue(
      this,
      function (__glintRef__, __glintDSL__: typeof import('@glint/core/-private/dsl')) {
        {
          const __glintY__ = __glintDSL__.emitElement('div');
          __glintDSL__.applyAttributes(__glintY__.element, {});
        }
        __glintRef__;
        __glintDSL__;
      },
    );
  }
}

interface ElementedComponentSignature {
  Element: HTMLDivElement;
}

class ElementedComponent extends Component<ElementedComponentSignature> {
  static {
    (({}) as typeof import('@glint/core/-private/dsl')).templateForBackingValue(
      this,
      function (__glintRef__, __glintDSL__: typeof import('@glint/core/-private/dsl')) {
        {
          const __glintY__ = __glintDSL__.emitElement('div');
          __glintDSL__.applyAttributes(__glintY__.element, {});
        }
        __glintRef__;
        __glintDSL__;
      },
    );
  }
}

export default class AttributesTest extends Component {
  private message = 'Hello';

  static {
    (({}) as typeof import('@glint/core/-private/dsl')).templateForBackingValue(
      this,
      function (__glintRef__, __glintDSL__: typeof import('@glint/core/-private/dsl')) {
        {
          const __glintY__ = __glintDSL__.emitComponent(
            __glintDSL__.resolve(ElementlessComponent)(),
          );
          // NEED TO WRAP __glintY__.element
          __glintDSL__.applyAttributes(__glintY__.element, {
            foo: 'bar',
          });
        }
        {
          const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(ElementedComponent)());

          // NEED TO WRAP individual elements or something i guess not sure what. NEVERMIND THIS IS HANDLED.
          __glintDSL__.applyAttributes(__glintY__.element, {
            foo: 'bar',
          });
        }
        __glintRef__;
        __glintDSL__;
      },
    );
  }
}
