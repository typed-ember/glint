import '@glint/ember-tsc/types';
import Component from '@glimmer/component';

import { expectTypeOf } from 'expect-type';
import {
  applyModifier,
  emitComponent,
  emitElement,
  emitContent,
  resolve,
  resolveOrReturn,
  templateForBackingValue,
  yieldToBlock,
  NamedArgsMarker,
  templateExpression,
  applyAttributes,
} from '../-private/dsl';
import TestComponent, { globals } from './test-component';

{
  /**
   * A Link component that can sometimes be a div, if the href is missing
   */

  type Signature<Args> = Args extends { href: string }
    ? {
        Element: HTMLAnchorElement;
        Args: { href: string };
        Blocks: { default: [] };
      }
    : {
        Element: HTMLDivElement;
        Args: { foo?: number };
        Blocks: { default: [] };
      };

  class Link<Args> extends Component<Signature<Args>> {}

  // Renders as anchor
  {
    const __glintY__ = emitComponent(
      resolve(Link)({
        // Error unexpected
        href: 'https://www.auditboard.com/platform/ai',
        ...NamedArgsMarker,
      }),
    );

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
      resolve(Link)({
        // @ts-expect-error: wrong arg type (deliberate)
        href: 2,
        ...NamedArgsMarker,
      }),
    );

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
      resolve(SomeInput)({
        // Error unexpected
        value: 'test',
        ...NamedArgsMarker,
      }),
    );

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
      resolve(SomeInput)({
        // Error unexpected
        html: 'https://www.auditboard.com/platform/ai',
        ...NamedArgsMarker,
      }),
    );

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
