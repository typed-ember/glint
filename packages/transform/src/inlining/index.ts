import { NodePath, types as t } from '@babel/core';
import generate from '@babel/generator';
import { CorrelatedSpan, Directive, TransformError } from '../transformed-module';

export type PartialCorrelatedSpan = Omit<CorrelatedSpan, 'transformedStart' | 'transformedLength'>;

export type CorrelatedSpansResult = {
  errors: Array<TransformError>;
  directives: Array<Directive>;
  partialSpans: Array<PartialCorrelatedSpan>;
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
export function getContainingTypeInfo(
  path: NodePath<any>
): { className?: string; inClass: boolean; contextType?: string; typeParams?: string } {
  let container = findContainingClass(path);
  let inClass = Boolean(container);
  let className = container?.id?.name;
  let contextType = className;
  let typeParams = undefined;

  let typeParamsNode = container?.typeParameters;
  if (t.isTSTypeParameterDeclaration(typeParamsNode)) {
    typeParams = generate(typeParamsNode).code;
    contextType += `<${typeParamsNode.params.map((param) => param.name).join(', ')}>`;
  }

  return { contextType, typeParams, className, inClass };
}

function findContainingClass(path: NodePath<any>): t.Class | null {
  let current: NodePath<any> = path;
  do {
    if (t.isClass(current.node)) {
      return current.node;
    }
  } while ((current = current.parentPath));
  return null;
}
