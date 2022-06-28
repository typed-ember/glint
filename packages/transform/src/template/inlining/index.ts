import type ts from 'typescript';
import { CorrelatedSpan, Directive, TransformError } from '../transformed-module';
import { TSLib } from '../../util';

export type PartialCorrelatedSpan = Omit<CorrelatedSpan, 'transformedStart' | 'transformedLength'>;

export type CorrelatedSpansResult = {
  errors: Array<TransformError>;
  directives: Array<Directive>;
  partialSpans: Array<PartialCorrelatedSpan>;
};

export type ContainingTypeInfo = {
  inClass: boolean;
  className: string | undefined;
  contextType: string | undefined;
  typeParams: string | undefined;
};

/**
 * Given an AST node for an embedded template, determines the appropriate
 * instance type to be passed to `@glint/template`'s `ResolveContext`, as well
 * as any type parameters that need to be propagated as inputs to the template's
 * root generator function.
 *
 * For example, a template declared within `class MyComponent<T extends string>`
 * would give `MyComponent<T>` as the context type, and `<T extends string>` as
 * the type params, ultimately resulting in a template function like:
 *
 *     template(function*<T extends string>(𝚪: ResolveContext<MyComponent<T>>){
 *       // ...
 *     })
 */
export function getContainingTypeInfo(ts: TSLib, node: ts.Node): ContainingTypeInfo {
  let container = findContainingClass(ts, node);
  let inClass = Boolean(container);
  let className = container?.name?.text;
  let contextType = className;
  let typeParams = undefined;

  if (container?.typeParameters) {
    let params = container.typeParameters;
    typeParams = `<${params.map((param) => param.getText()).join(', ')}>`;
    contextType += `<${params.map((param) => param.name.getText()).join(', ')}>`;
  }

  return { contextType, typeParams, className, inClass };
}

function findContainingClass(ts: TSLib, node: ts.Node): ts.ClassLikeDeclaration | null {
  let current: ts.Node | null = node;
  do {
    if (ts.isClassLike(current)) {
      return current;
    }
  } while ((current = current.parent));
  return null;
}
