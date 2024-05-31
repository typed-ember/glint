import type ts from 'typescript';
import { CorrelatedSpan, Directive, TransformError } from '../transformed-module.js';
import { TSLib } from '../../util.js';

export type PartialCorrelatedSpan = Omit<CorrelatedSpan, 'transformedStart' | 'transformedLength'>;

export type CorrelatedSpansResult = {
  errors: Array<TransformError>;
  directives: Array<Directive>;
  partialSpans: Array<PartialCorrelatedSpan>;
};

/**
 * Given an AST node for an embedded template, determines whether it's embedded
 * within a class in such a way that that class should be treated as its backing
 * value.
 */
export function isEmbeddedInClass(ts: TSLib, node: ts.Node): boolean {
  let current: ts.Node | null = node;
  do {
    // TODO: this should likely actually filter on whether the template appears in a
    // static block or property definition, but just "am I in a class body" is the
    // current status quo and has been ok so far.
    if (ts.isHeritageClause(current)) {
      return false;
    }
    if (ts.isClassLike(current)) {
      return true;
    }
  } while ((current = current.parent));

  return false;
}
