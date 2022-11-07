import {
  Globals,
  resolve,
  applySplattributes,
  emitComponent,
  NamedArgsMarker,
} from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';

let linkTo = resolve(Globals['link-to']);
let LinkTo = resolve(Globals['LinkTo']);

emitComponent(linkTo('index', 123));

// @ts-expect-error: bad type for route name
linkTo({}, 123);

// {{#link-to}}

{
  const component = emitComponent(linkTo('index'));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(linkTo('index'));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(linkTo('index', { query: { a: 123 }, ...NamedArgsMarker }));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(linkTo('index', { models: [123, 'abc'], ...NamedArgsMarker }));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(linkTo('index', { 'current-when': 'index', ...NamedArgsMarker }));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(linkTo('index', { 'current-when': true, ...NamedArgsMarker }));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

// <LinkTo>

{
  const component = emitComponent(LinkTo({ route: 'index', model: 123, ...NamedArgsMarker }));
  expectTypeOf(component.element).toEqualTypeOf<HTMLAnchorElement>();
  applySplattributes(new HTMLAnchorElement(), component.element);
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(LinkTo({ route: 'index', ...NamedArgsMarker }));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(
    LinkTo({ route: 'index', query: { a: 123 }, ...NamedArgsMarker })
  );
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(
    LinkTo({ route: 'index', models: [123, 'abc'], ...NamedArgsMarker })
  );
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(
    LinkTo({ route: 'index', 'current-when': 'index', ...NamedArgsMarker })
  );
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(
    LinkTo({ route: 'index', 'current-when': true, ...NamedArgsMarker })
  );
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

// Requires at least one of `@route`, `@model`, `@models` or `@query`

{
  const component = emitComponent(
    LinkTo(
      // @ts-expect-error: missing one of required props
      { ...NamedArgsMarker }
    )
  );
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(LinkTo({ model: 123, ...NamedArgsMarker }));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(LinkTo({ models: [123], ...NamedArgsMarker }));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(LinkTo({ query: { a: 123 }, ...NamedArgsMarker }));
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}
