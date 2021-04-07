import {
  AcceptsBlocks,
  ElementInvokable,
  EmptyObject,
  HasElement,
  Invokable,
} from '@glint/template/-private/integration';

type Constructor<T> = new (...params: any) => T;
type Get<T, K, Otherwise = EmptyObject> = K extends keyof T ? Exclude<T[K], undefined> : Otherwise;

export type ElementOf<C extends ComponentLike> = C extends Constructor<HasElement<infer Element>>
  ? Element
  : null;

export type ArgsOf<C extends ComponentLike> = C extends Constructor<
  Invokable<(args: infer Args) => any>
>
  ? Args
  : never;

export type YieldsOf<C extends ComponentLike> = C extends Constructor<
  Invokable<(args: any) => AcceptsBlocks<infer Yields, any>>
>
  ? Yields
  : never;

/**
 * The basic shape of a valid component signature. See the
 * README for further details.
 */
export type ComponentSignature = {
  Args?: Partial<Record<string, unknown>>;
  Yields?: Partial<Record<string, Array<unknown>>>;
  Element?: Element | null;
};

/**
 * A value that is invokable like a component in a template. Notably,
 * subclasses of `EmberComponent` and `GlimmerComponent` are `ComponentLike`,
 * as are the values returned from the `{{component}}` helper.
 */
export type ComponentLike<T extends ComponentSignature = any> = Constructor<
  ElementInvokable<
    Get<T, 'Element', null>,
    (args: Get<T, 'Args'>) => AcceptsBlocks<Get<T, 'Yields'>>
  >
>;

/**
 * A shorthand type for declaring the result of a `{{component}}`
 * call. For instance, if you had a component like this:
 *
 * ```ts
 * class MyComponent extends Component<{ Args: { foo: string; bar: number } }> {}
 * ```
 *
 * And yielded it to a block like this:
 *
 * ```handlebars
 * {{yield (component 'my-component' foo="hello")}}
 * ```
 *
 * You could type that yield parameter as:
 *
 * ```ts
 * ComponentWithBoundArgs<typeof MyComponent, 'foo'>;
 * ```
 *
 * And the resulting `ComponentLike` would have the `foo` key as
 * optional in its `Args`.
 *
 * Note that this shorthand won't work if the type of other args
 * or of yielded parameters depends on the type of one or more
 * bound arguments. In such cases you may need to construct a
 * `ComponentLike` type manually instead.
 *
 * Note also that you must have `strictFunctionTypes` enabled for
 * TypeScript to fully enforce that the bound component you pass
 * actually _meets_ the given type. Given the definition above,
 * You can write `{{component 'my-component'}}` and pass that value
 * in a place where you said to expect the `foo` arg to already be
 * bound, that won't be flagged as an error if `strictFunctionTypes`
 * is disabled.
 */
export type ComponentWithBoundArgs<
  T extends ComponentLike,
  BoundArgs extends keyof ArgsOf<T>
> = ComponentLike<{
  Element: ElementOf<T>;
  Yields: YieldsOf<T>;
  Args: Omit<ArgsOf<T>, BoundArgs> & Partial<Pick<ArgsOf<T>, BoundArgs>>;
}>;
