import { template, resolve, invokeBlock, ResolveContext } from '@glint/template';
import TestComponent from './test-component';
import { DirectInvokable } from '../-private/resolution';
import { CreatesModifier } from '../-private';
import {
  applyAttributes,
  applyModifier,
  applySplattributes,
  ElementForComponent,
  ElementForTagName,
} from '../-private/attributes';
import { EmptyObject } from '../-private/signature';
import { expectTypeOf } from 'expect-type';

declare const imageModifier: DirectInvokable<(
  args: EmptyObject
) => CreatesModifier<HTMLImageElement>>;

class GenericElementComponent extends TestComponent<{ Element: HTMLElement }> {}

class MyComponent extends TestComponent<{ Element: HTMLImageElement }> {
  /**
   * ```handlebars
   * <img ...attributes {{imageModifier}}>
   * ```
   */
  public static template = template(function (𝚪: ResolveContext<MyComponent>) {
    expectTypeOf(𝚪.element).toEqualTypeOf<HTMLImageElement>();

    applyModifier<ElementForTagName<'img'>>(resolve(imageModifier)({}));
    applySplattributes<typeof 𝚪.element, ElementForTagName<'img'>>();
  });
}

// `ElementForComponent`
expectTypeOf<ElementForComponent<typeof MyComponent>>().toEqualTypeOf<HTMLImageElement>();
expectTypeOf<ElementForComponent<typeof GenericElementComponent>>().toEqualTypeOf<HTMLElement>();
expectTypeOf<ElementForComponent<typeof TestComponent>>().toEqualTypeOf<null>();

// `ElementForTagName`
expectTypeOf<ElementForTagName<'img'>>().toEqualTypeOf<HTMLImageElement>();
expectTypeOf<ElementForTagName<'unknown'>>().toEqualTypeOf<Element>();

/**
 * ```handlebars
 * <MyComponent ...attributes foo="bar" />
 * ```
 */
applySplattributes<ElementForTagName<'img'>, ElementForComponent<typeof MyComponent>>();
applyAttributes<ElementForComponent<typeof MyComponent>>({ foo: 'bar' });
invokeBlock(resolve(MyComponent)({}), {});

// Error conditions:

// @ts-expect-error: Trying to pass splattributes specialized for another element
applySplattributes<ElementForTagName<'form'>, ElementForTagName<'unknown'>>();
// @ts-expect-error: Trying to pass splattributes specialized for another element
applySplattributes<ElementForTagName<'form'>, ElementForComponent<typeof MyComponent>>();
// @ts-expect-error: Trying to apply splattributes to a component with no root element
applySplattributes<ElementForTagName<'unknown'>, ElementForComponent<typeof TestComponent>>();

// @ts-expect-error: `imageModifier` expects an `HTMLImageElement`
applyModifier<HTMLDivElement>(resolve(imageModifier)({}));
// @ts-expect-error: `imageModifier` expects an `HTMLImageElement`
applyModifier<typeof GenericElementComponent>(resolve(imageModifier)({}));
// @ts-expect-error: Trying to apply a modifier to a component with no root element
applyModifier<typeof TestComponent>(resolve(imageModifier)({}));

// @ts-expect-error: Trying to apply attributes to a component with no root element
applyAttributes<typeof TestComponent>({ foo: 'bar' });
