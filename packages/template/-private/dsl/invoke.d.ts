import { AcceptsBlocks, AnyBlocks, AnyContext, BoundModifier } from '../integration';
import { SafeString } from '@glimmer/runtime';

export type EmittableValue = SafeString | Element | string | number | boolean | null | void;

/*
 * Emits the given value to the DOM. This corresponds to a mustache
 * statement either at the top level:
 *
 *     {{value}}
 *     {{value foo=bar}}
 *     <div data-x={{value foo=bar}}>
 *     <div data-x="hello {{value foo=bar}}">
 */
export declare function emitValue<T extends AcceptsBlocks<{}, any> | EmittableValue>(
  value: T
): void;

/*
 * Invokes the given value as an entity that expects to receive blocks
 * rather than return a value. This corresponds to a block-form mustache
 * statement or any angle-bracket component invocation, i.e.:
 *
 *     {{#value foo=bar}}{{/value}}
 *     <Value @foo={{bar}}></Value>
 *     <Value @foo={{bar}} />
 *
 * This form of invocation is the only one in a template that accepts
 * blocks.
 */
export declare function invokeBlock<Yields extends AnyBlocks>(
  value: AcceptsBlocks<Yields>,
  blocks: {
    [Block in keyof Yields]: (...params: NonNullable<Yields[Block]>) => void;
  }
): void;

/**
 * Acts as a top-level wrapper for translated template bodies.
 */
export declare function template(f: (𝚪: AnyContext) => void): void;

/*
 * Used in template bodies to encode a `{{yield}}` statement.
 *
 *     {{yield foo bar to='name'}}
 *
 * Is equivalent to:
 *
 *     yieldToBlock(𝚪, 'name', foo, bar);
 */
export declare function yieldToBlock<Context extends AnyContext, K extends keyof Context['yields']>(
  𝚪: Context,
  to: K,
  ...values: NonNullable<Context['yields'][K]>
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
export declare function applyAttributes(element: Element, attrs: Record<string, unknown>): void;

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
