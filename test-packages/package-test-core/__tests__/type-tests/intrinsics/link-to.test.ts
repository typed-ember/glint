import {
  applySplattributes,
  emitComponent,
  NamedArgsMarker,
  resolve,
} from '@glint/ember-tsc/-private/dsl';
import { expectTypeOf } from 'expect-type';

import { LinkTo as LinkToImport } from '@ember/routing';

let LinkTo = resolve(LinkToImport);

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
    LinkTo({ route: 'index', query: { a: 123 }, ...NamedArgsMarker }),
  );
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(
    LinkTo({ route: 'index', models: [123, 'abc'], ...NamedArgsMarker }),
  );
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(
    LinkTo({ route: 'index', 'current-when': 'index', ...NamedArgsMarker }),
  );
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

{
  const component = emitComponent(
    LinkTo({ route: 'index', 'current-when': true, ...NamedArgsMarker }),
  );
  expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
}

// Requires at least one of `@route`, `@model`, `@models` or `@query`

{
  const component = emitComponent(
    LinkTo(
      // @ts-expect-error: missing one of required props
      { ...NamedArgsMarker },
    ),
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
