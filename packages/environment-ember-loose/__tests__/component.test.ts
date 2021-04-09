import UpstreamEmberComponent from '@ember/component';
import Component, { ComponentSignature } from '@glint/environment-ember-loose/ember-component';
import {
  template,
  resolve,
  ResolveContext,
  yieldToBlock,
  emitComponent,
  bindBlocks,
} from '@glint/environment-ember-loose/-private/dsl';
import { EmptyObject } from '@glint/template/-private/integration';
import { expectTypeOf } from 'expect-type';

// Our `Component` reexport should inherit static members
expectTypeOf(Component.extend).toEqualTypeOf(UpstreamEmberComponent.extend);

{
  class NoArgsComponent extends Component {
    static template = template(function* (𝚪: ResolveContext<NoArgsComponent>) {
      𝚪;
    });
  }

  resolve(NoArgsComponent)({
    // @ts-expect-error: extra named arg
    foo: 'bar',
  });

  resolve(NoArgsComponent)(
    {},
    // @ts-expect-error: extra positional arg
    'oops'
  );

  emitComponent(resolve(NoArgsComponent)({}), (component) =>
    bindBlocks(component.blockParams, {
      // @ts-expect-error: never yields, so shouldn't accept blocks
      default() {},
    })
  );

  emitComponent(resolve(NoArgsComponent)({}), (component) => bindBlocks(component.blockParams, {}));
}

{
  class StatefulComponent extends Component {
    private foo = 'hello';

    static template = template(function* (𝚪: ResolveContext<StatefulComponent>) {
      expectTypeOf(𝚪.this.foo).toEqualTypeOf<string>();
      expectTypeOf(𝚪.this).toEqualTypeOf<StatefulComponent>();
      expectTypeOf(𝚪.args).toEqualTypeOf<EmptyObject>();
    });
  }

  emitComponent(resolve(StatefulComponent)({}), (component) =>
    bindBlocks(component.blockParams, {})
  );
}

{
  type ArgsOf<T extends ComponentSignature> = 'Args' extends keyof T ? T['Args'] : EmptyObject;

  interface YieldingComponentSignature<T> {
    Args: {
      values: Array<T>;
    };
    Yields: {
      default: [T];
      inverse?: [];
    };
  }

  interface YieldingComponent<T> extends ArgsOf<YieldingComponentSignature<T>> {}
  class YieldingComponent<T> extends Component<YieldingComponentSignature<T>> {
    static template = template(function* <T>(𝚪: ResolveContext<YieldingComponent<T>>) {
      expectTypeOf(𝚪.this).toEqualTypeOf<YieldingComponent<T>>();
      expectTypeOf(𝚪.args).toEqualTypeOf<{ values: T[] }>();

      expectTypeOf(𝚪.this.values).toEqualTypeOf<Array<T>>();

      if (𝚪.args.values.length) {
        yieldToBlock(𝚪, 'default', 𝚪.args.values[0]);
      } else {
        yieldToBlock(𝚪, 'inverse');
      }
    });
  }

  // @ts-expect-error: missing required arg
  resolve(YieldingComponent)({});

  // @ts-expect-error: incorrect type for arg
  resolve(YieldingComponent)({ values: 'hello' });

  // @ts-expect-error: extra arg
  resolve(YieldingComponent)({ values: [1, 2, 3], oops: true });

  emitComponent(resolve(YieldingComponent)({ values: [1, 2, 3] }), (component) =>
    bindBlocks(component.blockParams, {
      default(value) {
        expectTypeOf(value).toEqualTypeOf<number>();
      },
    })
  );

  emitComponent(resolve(YieldingComponent)({ values: [1, 2, 3] }), (component) =>
    bindBlocks(component.blockParams, {
      default(...args) {
        expectTypeOf(args).toEqualTypeOf<[number]>();
      },

      inverse(...args) {
        expectTypeOf(args).toEqualTypeOf<[]>();
      },
    })
  );
}
