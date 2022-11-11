import { assert } from '../util.js';

/**
 * A `ScopeStack` is used while traversing a template
 * to track what identifiers are currently in scope.
 */
export default class ScopeStack {
  private stack: Array<Set<string>>;

  public constructor(identifiers: string[]) {
    this.stack = [new Set(identifiers)];
  }

  public push(identifiers: Array<string>): void {
    let scope = new Set(this.top);
    for (let identifier of identifiers) {
      scope.add(identifier);
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

  private get top(): Set<string> {
    return this.stack[0];
  }
}
