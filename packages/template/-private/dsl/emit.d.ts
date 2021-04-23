import { AcceptsBlocks, AnyContext, BoundModifier } from '../integration';
import { ElementForTagName, EmittableValue } from './types';

/*
 * Emits the given value to the DOM. This corresponds to a mustache
 * statement either at the top level:
 *
 *     {{value}}
 *     {{value foo=bar}}
 *     <div data-x={{value foo=bar}}>
 *     <div data-x="hello {{value foo=bar}}">
 */
export declare function emitValue(value: AcceptsBlocks<{}, any> | EmittableValue): void;

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
