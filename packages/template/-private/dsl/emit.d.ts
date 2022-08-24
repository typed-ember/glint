import { AttrValue, ContentValue } from '..';
import {
  AcceptsBlocks,
  AnyContext,
  AnyFunction,
  BoundModifier,
  EmptyObject,
  HasContext,
  Invokable,
  TemplateContext,
} from '../integration';
import { ElementForTagName } from './types';

/*
 * Emits the given value as top-level content to the DOM. This:
 *
 *     Hello, {{world}}
 *
 * Would produce code like:
 *
 *     emitContent(resolveOrReturn(value)({}))
 */
export declare function emitContent(value: ContentValue): void;

/*
 * Emits an element of the given name, providing a value to the
 * given handler of an appropriate type for the DOM node that will
 * be produced. This:
 *
 *     <div ...attributes class="hello" {{on "click" this.clicked}}></div>
 *
 * Would produce code like:
 *
 *     emitElement('div', (𝛄) => {
 *       applySplattributes(𝚪.element, 𝛄.element);
 *       applyAttributes(𝛄.element, { class: 'hello' });
 *       applyModifier(𝛄.element, resolve(on)({}, 'click', this.clicked));
 *     });
 */
export declare function emitElement<Name extends string>(
  name: Name
): { element: ElementForTagName<Name> };

/*
 * Emits the given value as an entity that expects to receive blocks
 * rather than return a value. This corresponds to a block-form mustache
 * statement or any angle-bracket component invocation, i.e.:
 *
 *     {{#value foo=bar}}{{/value}}
 *     <Value @foo={{bar}} {{baz}}></Value>
 *     <Value @foo={{bar}} {{baz}} />
 *
 * This form of invocation is the only one in a template that may have
 * blocks bound to it. The final line above would produce code like:
 *
 *     emitComponent(resolve(Value)({ foo: bar })), (𝛄) => {
 *       applyModifier(𝛄.element, resolve(baz)({}));
 *     });
 */
export declare function emitComponent<T extends AcceptsBlocks<any, any>>(
  component: T
): {
  element: T extends AcceptsBlocks<any, infer El> ? El : any;
  blockParams: T extends AcceptsBlocks<infer Yields, any> ? Required<Yields> : any;
};

/*
 * Wraps a template body that appears as a standalone expression and is therefore not
 * associated with any backing value.
 *
 * The given callback accepts a template context value as well as an instance of the
 * environment's DSL export.
 */
export declare function templateExpression<
  Signature extends AnyFunction = (args: EmptyObject) => AcceptsBlocks<EmptyObject>,
  Context extends AnyContext = TemplateContext<void, EmptyObject, EmptyObject, void>
>(f: (𝚪: Context, χ: never) => void): new () => Invokable<Signature> & HasContext<Context>;

/*
 * Wraps a template body that's backed by a known value (typically a class), either
 * via a `.hbs` association to a default export or via embedding e.g. with `<template>`.
 *
 * The given callback accepts a template context value as well as an instance of the
 * environment's DSL export.
 *
 * Note that the constructor-based signature returns an (arbitrary) abstract constructor
 * type in order to trigger TypeScript's higher-order function type inference and propagate
 * any type parameters on the class (see https://github.com/microsoft/TypeScript/pull/30215)
 */
export declare function templateForBackingValue<Args extends unknown[], Context extends AnyContext>(
  backingValue: abstract new (...args: Args) => HasContext<Context>,
  body: (𝚪: Context, χ: never) => void
): abstract new () => unknown;
export declare function templateForBackingValue<Context extends AnyContext>(
  backingValue: HasContext<Context>,
  body: (𝚪: Context, χ: never) => void
): void;

/*
 * Used in template bodies to encode a `{{yield}}` statement.
 *
 *     {{yield foo bar to='name'}}
 *
 * Is equivalent to:
 *
 *     yieldToBlock(𝚪, 'name', foo, bar);
 */
export declare function yieldToBlock<Context extends AnyContext, K extends keyof Context['blocks']>(
  𝚪: Context,
  to: K,
  ...values: NonNullable<Context['blocks'][K]>
): void;

/*
 * Applies `...attributes` that were passed to a component down
 * to an element or child component invocation in its template.
 *
 *     <div ...attributes></div>
 *     <AnotherComponent ...attributes />
 */
export declare function applySplattributes<
  SourceElement extends Element,
  TargetElement extends SourceElement
>(source: SourceElement, target: TargetElement): void;

/*
 * Applies named attributes to an element or component.
 *
 *     <div foo={{bar}}></div>
 *     <AnotherComponent foo={{bar}} />
 */
export declare function applyAttributes(element: Element, attrs: Record<string, AttrValue>): void;

/*
 * Applies a modifier to an element or component.
 *
 *     <div {{someModifier}}></div>
 *     <AnotherComponent {{someModifier}} />
 */
export declare function applyModifier<TargetElement extends Element>(
  element: TargetElement,
  modifier: BoundModifier<TargetElement>
): void;
