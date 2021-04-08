import {
  Globals,
  resolve,
  applySplattributes,
  emitComponent,
  bindBlocks,
} from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';

let linkTo = resolve(Globals['link-to']);
let LinkTo = resolve(Globals['LinkTo']);

emitComponent(linkTo({}, 'index', 123), (component) => bindBlocks(component.blockParams, {}));

// @ts-expect-error: bad type for route name
linkTo({}, 123);

emitComponent(LinkTo({ route: 'index', model: 123 }), (component) => {
  expectTypeOf(component.element).toEqualTypeOf<HTMLAnchorElement>();
  applySplattributes(new HTMLAnchorElement(), component.element);

  bindBlocks(component.blockParams, {
    default() {},
  });
});

emitComponent(LinkTo({ route: 'index' }), (component) =>
  bindBlocks(component.blockParams, {
    default() {},
  })
);

emitComponent(LinkTo({ route: 'index', query: { a: 123 } }), (component) =>
  bindBlocks(component.blockParams, {
    default() {},
  })
);

emitComponent(LinkTo({ route: 'index', models: [123, 'abc'] }), (component) =>
  bindBlocks(component.blockParams, {
    default() {},
  })
);

// Requires at least one of `@route`, `@model`, `@models` or `@query`

emitComponent(
  LinkTo(
    // @ts-expect-error: missing one of required props
    {}
  ),
  (component) =>
    bindBlocks(component.blockParams, {
      default() {},
    })
);

emitComponent(LinkTo({ model: 123 }), (component) =>
  bindBlocks(component.blockParams, {
    default() {},
  })
);

emitComponent(LinkTo({ models: [123] }), (component) =>
  bindBlocks(component.blockParams, {
    default() {},
  })
);

emitComponent(LinkTo({ query: { a: 123 } }), (component) =>
  bindBlocks(component.blockParams, {
    default() {},
  })
);
