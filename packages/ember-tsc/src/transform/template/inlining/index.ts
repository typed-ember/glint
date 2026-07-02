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
 *
 * Only a class-member `<template>` (the class's own template) is backed by the
 * class; the environment transform rewrites that form into a static block, so
 * we look for one on the way up. A template anywhere else inside a class —
 * a field initializer, a method body, a heritage clause — is an expression
 * template (RFC 931 implicit form): a template-only component whose `this` is
 * the *lexical* `this` of its position, captured like an arrow function's.
 * Treating those as class-backed emitted `templateForBackingValue(this, ...)`
 * into positions where `this` is not the class constructor, which broke
 * `Context` inference and silently typed the template's `{{this}}` as `any`
 * (#1182). Expression templates instead emit an arrow whose body references
 * `this` directly — see `templateExpression` in `template-to-typescript.ts`.
 */
export function isEmbeddedInClass(ts: TSLib, node: ts.Node): boolean {
  let current: ts.Node | null = node;
  do {
    if (ts.isClassStaticBlockDeclaration(current)) {
      return true;
    }
    if (ts.isClassLike(current) || ts.isHeritageClause(current)) {
      return false;
    }
  } while ((current = current.parent));

  return false;
}
