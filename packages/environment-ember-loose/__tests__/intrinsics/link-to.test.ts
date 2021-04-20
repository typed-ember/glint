import {
  Globals,
  resolve,
  applySplattributes,
  emitComponent,
} from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';

let linkTo = resolve(Globals['link-to']);
let LinkTo = resolve(Globals['LinkTo']);

emitComponent(linkTo({}, 'index', 123));

// @ts-expect-error: bad type for route name
linkTo({}, 123);

{
  const component = emitComponent(LinkTo({ route: 'index', model: 123 }));
  expectTypeOf(component.element).toEqualTypeOf<HTMLAnchorElement>();
  applySplattributes(new HTMLAnchorElement(), component.element);
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(LinkTo({ route: 'index' }));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(LinkTo({ route: 'index', query: { a: 123 } }));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(LinkTo({ route: 'index', models: [123, 'abc'] }));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(LinkTo({ route: 'index', 'current-when': 'index' }));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(LinkTo({ route: 'index', 'current-when': true }));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

// Requires at least one of `@route`, `@model`, `@models` or `@query`

{
  const component = emitComponent(
    LinkTo(
      // @ts-expect-error: missing one of required props
      {}
    )
  );
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(LinkTo({ model: 123 }));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(LinkTo({ models: [123] }));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(LinkTo({ query: { a: 123 } }));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}
