/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-unused-vars */
import '@glint/ember-tsc/types';
import Component from '@glimmer/component';

import { expectTypeOf } from 'expect-type';
import {
  emitComponent,
  resolve,
  resolveComponent,
  resolveModifier,
  NamedArgsMarker,
  applyAttributes,
  emitElement,
  applyModifier,
} from '../-private/dsl';
import { ModifierLike } from '../-private';
import {
  AnyFunction,
  ComponentReturn,
  Invoke,
  Element,
  Blocks,
  Invokable,
  InvokableInstance,
} from '../-private/integration';

{
  /**
   * A Link component that can sometimes be a div, if the href is missing
   */

  type Signature<Args> = Args extends { href: string }
    ? {
        Element: HTMLAnchorElement;
        Args: Args;
        Blocks: { default: [] };
      }
    : {
        Element: HTMLDivElement;
        Args: { div: true } & Args;
        Blocks: { default: [] };
      };

  class Link<Args> extends Component<Signature<Args>> {}

  // Manual sanity checking for the above signature
  {
    type X = ReturnType<Link<{ href: string }>[typeof Invoke]>;
    type Y = X[typeof Element];

    expectTypeOf<Y>().toEqualTypeOf<HTMLAnchorElement>();

    type A = ReturnType<Link<{ foo: string }>[typeof Invoke]>;
    type B = A[typeof Element];

    expectTypeOf<B>().toEqualTypeOf<HTMLDivElement>();
  }
  // Manual sanity checking for the above signature
  // This proves that args can be associated to the component,
  // and that the return value can derive from the args.
  // This is the proof of concept for the part of glint/template that supports generics / narrowing.
  // {
  //   type GenericSignature = { Args: unknown, Element: Element };
  //   type Sig2<Args> = Args extends { href: string } ? { Args: Args, Element: HTMLAnchorElement } : { Args: Args, Element: HTMLDivElement };

  //   function test<Args, Sig extends GenericSignature>(y: Args): Sig['Element'] {
  //     return 0 as unknown as Sig['Element'];
  //   }
  //   interface Link2<Args> extends Sig2<Args> {}
  //   class Link2<Args> {}
  //   let n = test({ href: 'test' });
  //   expectTypeOf(n).toEqualTypeOf<HTMLAnchorElement>();
  //   let m = test({ foo: 123 });
  //   expectTypeOf(m).toEqualTypeOf<HTMLDivElement>();

  //   function elementOf<Args, Comp extends abstract new (owner: any, args: Args) => any>(args: Args, comp: Comp): ComponentReturn<any, Element> {
  //       return 0 as any;
  //     }

  //   let el = elementOf<Link>({ href: 'test'}, Link);

  //   expectTypeOf(el[Element]).toEqualTypeOf<HTMLAnchorElement>();
  // }

  // Renders as anchor
  {
    const fn = resolve(Link);
    const resolved = fn<{ href: string }>({
      // Error unexpected
      href: 'https://www.auditboard.com/platform/ai',
      ...NamedArgsMarker,
    });

    expectTypeOf(resolved).not.toBeAny();
    expectTypeOf(resolved).not.toEqualTypeOf<AnyFunction>();
    expectTypeOf(resolved).not.toBeUnknown();

    const __glintY__ = emitComponent(resolved);

    expectTypeOf(__glintY__.element).not.toBeAny();
    expectTypeOf(__glintY__.element).toEqualTypeOf<HTMLAnchorElement>();

    // element here "should" be derived from args above, but it is not
    applyAttributes(__glintY__.element, {
      // error unexpected
      target: '_blank',
    });
  }
  {
    const resolved = resolveComponent(Link, {
      // Error unexpected
      href: 'https://www.auditboard.com/platform/ai',
      ...NamedArgsMarker,
    });

    expectTypeOf(resolved).not.toBeAny();
    expectTypeOf(resolved).not.toEqualTypeOf<AnyFunction>();
    expectTypeOf(resolved).not.toBeUnknown();

    const __glintY__ = emitComponent(resolved);

    expectTypeOf(__glintY__.element).not.toBeAny();
    expectTypeOf(__glintY__.element).toEqualTypeOf<HTMLAnchorElement>();

    // element here "should" be derived from args above, but it is not
    applyAttributes(__glintY__.element, {
      // error unexpected
      target: '_blank',
    });
  }

  // Renders as div
  {
    const __glintY__ = emitComponent(
      resolveComponent(Link, {
        // @ts-expect-error: wrong arg type (deliberate)
        href: 2,
        ...NamedArgsMarker,
      }),
    );

    expectTypeOf(__glintY__.element).not.toBeAny();
    expectTypeOf(__glintY__.element).toEqualTypeOf<HTMLDivElement>();

    // element here "should" be derived from args above, but it is not
    applyAttributes(__glintY__.element, {
      // @ts-expect-error: target not valid on div
      target: '_blank',
    });
  }
}

{
  /**
   * A Link component that can sometimes be a div, if the href is missing
   * but where the condition is on Args, not the whole signature
   */

  interface Signature<Args> {
    Element: Args extends { href: string } ? HTMLAnchorElement : HTMLDivElement;
    Args: Args;
    Blocks: { default: [] };
  }

  class Link<Args> extends Component<Signature<Args>> {}

  // Manual sanity checking for the above signature
  {
    type X = ReturnType<Link<{ href: string }>[typeof Invoke]>;
    type Y = X[typeof Element];

    expectTypeOf<Y>().toEqualTypeOf<HTMLAnchorElement>();

    type A = ReturnType<Link<{ foo: string }>[typeof Invoke]>;
    type B = A[typeof Element];

    expectTypeOf<B>().toEqualTypeOf<HTMLDivElement>();
  }

  // Renders as anchor
  {
    const fn = resolve(Link);
    const resolved = fn({
      // Error unexpected
      href: 'https://www.auditboard.com/platform/ai',
      ...NamedArgsMarker,
    });

    expectTypeOf(resolved).not.toBeAny();
    expectTypeOf(resolved).not.toEqualTypeOf<AnyFunction>();
    expectTypeOf(resolved).not.toBeUnknown();

    const __glintY__ = emitComponent(resolved);

    expectTypeOf(__glintY__.element).not.toBeAny();
    expectTypeOf(__glintY__.element).toEqualTypeOf<HTMLAnchorElement>();

    // element here "should" be derived from args above, but it is not
    applyAttributes(__glintY__.element, {
      // error unexpected
      target: '_blank',
    });
  }

  // Renders as div
  {
    const __glintY__ = emitComponent(
      resolveComponent(Link, {
        // @ts-expect-error: wrong arg type (deliberate)
        href: 2,
        ...NamedArgsMarker,
      }),
    );

    expectTypeOf(__glintY__.element).not.toBeAny();
    expectTypeOf(__glintY__.element).toEqualTypeOf<HTMLDivElement>();

    // element here "should" be derived from args above, but it is not
    applyAttributes(__glintY__.element, {
      // @ts-expect-error: target not valid on div
      target: '_blank',
    });
  }
}

{
  /**
   * An input component that can sometimes be a textarea
   */

  type Signature<Args> = Args extends { value: string }
    ? {
        Element: HTMLInputElement;
        Args: { value: string };
        Blocks: { default: [] };
      }
    : {
        Element: HTMLTextAreaElement;
        Args: { html: string };
        Blocks: { default: [] };
      };

  class SomeInput<Args> extends Component<Signature<Args>> {}

  // Renders as input
  {
    const __glintY__ = emitComponent(
      resolveComponent(SomeInput, {
        // Error unexpected
        value: 'test',
        ...NamedArgsMarker,
      }),
    );

    expectTypeOf(__glintY__.element).not.toBeAny();
    expectTypeOf(__glintY__.element).toEqualTypeOf<HTMLInputElement>();

    // element here "should" be derived from args above, but it is not
    applyAttributes(__glintY__.element, {
      // error unexpected
      value: 'hello',
      // @ts-expect-error: not valid on input
      wrap: 'hard',
    });
  }

  // Renders as textarea
  {
    const __glintY__ = emitComponent(
      resolveComponent(SomeInput, {
        // Error unexpected
        html: 'https://www.auditboard.com/platform/ai',
        ...NamedArgsMarker,
      }),
    );

    expectTypeOf(__glintY__.element).not.toBeAny();
    expectTypeOf(__glintY__.element).toEqualTypeOf<HTMLTextAreaElement>();

    // element here "should" be derived from args above, but it is not
    applyAttributes(__glintY__.element, {
      // error unexpected
      value: 'hello',

      // @ts-expect-error not valid on textarea
      checked: 'true',
      // @ts-expect-error: not valid on textarea
      alt: 'an alt tag',
    });
  }
}

/**
 * Modifiers *cannot* choose their element, based on args,
 * but the element can choose which args are available
 */
{
  type ImageModifier<Named> = Named extends { src: string }
    ? {
        Element: HTMLImageElement;
        Args: {
          Named: { src: string; alt?: string };
        };
      }
    : {
        Element: HTMLCanvasElement;
        Args: {
          Named: { width: number; height: number };
        };
      };

  interface DefaultSignature {
    Element: Element;
  }

  interface BaseClass<T> extends InstanceType<ModifierLike<T>> {}
  class BaseClass<T = DefaultSignature> {
    constructor(args: T) {}
  }
  /**
   * We have to fake a class modifier, so that we can pass along the
   * generic argument, or maybe rather enable TS to be able to infer
   */
  class ImageModifierClass<Named> extends BaseClass<ModifierLike<ImageModifier<Named>>> {}

  {
    const img = emitElement('img');
    const div = emitElement('div');
    const canvas = emitElement('canvas');

    expectTypeOf(img.element).toEqualTypeOf<HTMLImageElement>();

    applyModifier(
      resolveModifier(ImageModifierClass)(img.element, {
        // Correct: no error expected because the img element has a src attribute
        src: 'bar',
        ...NamedArgsMarker,
      }),
    );

    applyModifier(
      resolveModifier(ImageModifierClass)(canvas.element, {
        // Correct: no error expected because the canvas element has width and height attributes
        width: 200,
        height: 100,
        // @ts-expect-error: error expected because canvas element does not have a src attribute
        src: 'bar',
        ...NamedArgsMarker,
      }),
    );

    applyModifier(
      resolveModifier(ImageModifierClass)(
        // @ts-expect-error: wrong element type, expects image or canvas
        div.element,
      ),
    );
  }
}

/**
 * Modifiers with generic args, but static element
 */
{
  interface Area<V> {
    area: V;
  }

  type PositionalArgs<V> = [area: Area<V>, data: V[]];

  interface D3AreaSignature<V> {
    Element: SVGPathElement;
    Args: {
      Positional: PositionalArgs<V>;
    };
  }
  interface DefaultSignature {
    Element: Element;
  }
  interface Modifier<T> extends InstanceType<ModifierLike<T>> {}
  class Modifier<T = DefaultSignature> {
    constructor(args: T) {}
  }

  class D3Area<V> extends Modifier<D3AreaSignature<V>> {}

  let svgPath = emitElement('path');

  let resolved = resolve(D3Area);
  let withElement = resolved(svgPath.element, { area: 42 }, [1, 2, 3]);

  applyModifier(withElement);
}
