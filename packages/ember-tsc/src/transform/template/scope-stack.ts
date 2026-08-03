import { assert } from '../util.js';

type BindingInfo = {
  /**
   * Whether this binding aliases a `(component ... named=args)`-style curried
   * invokable from a `{{#let}}` initializer. Such references get cast to an
   * inference-inert type when consumed in argument position — see
   * `emitMustacheStatement` and `InferenceInertInvokable` in the environment
   * DSL. (#1068)
   */
  curriedInvokable: boolean;
};

const DEFAULT_BINDING: BindingInfo = { curriedInvokable: false };

/**
 * A `ScopeStack` is used while traversing a template
 * to track what identifiers are currently in scope.
 */
export default class ScopeStack {
  private stack: Array<Map<string, BindingInfo>>;

  public constructor(identifiers: string[]) {
    this.stack = [new Map(identifiers.map((identifier) => [identifier, DEFAULT_BINDING]))];
  }

  /**
   * Pushes a new scope frame with the given identifiers. Every pushed
   * identifier gets a fresh `BindingInfo`, so an inner binding always shadows
   * any metadata an outer same-named binding carried.
   */
  public push(identifiers: Array<string>, curriedInvokables?: ReadonlySet<string>): void {
    let scope = new Map(this.top);
    for (let identifier of identifiers) {
      scope.set(
        identifier,
        curriedInvokables?.has(identifier) ? { curriedInvokable: true } : DEFAULT_BINDING,
      );
    }
    this.stack.unshift(scope);
  }

  public pop(): void {
    assert(this.stack.length > 1);
    this.stack.shift();
  }

  public hasBinding(identifier: string): boolean {
    return this.top.has(identifier);
  }

  public isCurriedInvokable(identifier: string): boolean {
    return this.top.get(identifier)?.curriedInvokable ?? false;
  }

  private get top(): Map<string, BindingInfo> {
    return this.stack[0];
  }
}
