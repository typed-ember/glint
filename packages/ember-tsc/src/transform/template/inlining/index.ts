import { GlintEmitMetadata } from '@glint/ember-tsc/config-types';
import type ts from 'typescript';
import { CorrelatedSpan, Directive, TransformError } from '../transformed-module.js';
import { TSLib } from '../../util.js';

export type PartialCorrelatedSpan = Omit<CorrelatedSpan, 'transformedStart' | 'transformedLength'>;

export type CorrelatedSpansResult = {
  errors: Array<TransformError>;
  directives: Array<Directive>;
  partialSpans: Array<PartialCorrelatedSpan>;
};

export type ImportedBinding = { specifier: string; source: string; synthetic: boolean };
export type ImportedBindings = Record<string, ImportedBinding>;

/**
 * Everything the template transform needs to know about one embedded
 * `<template>`, independent of how the surrounding script was analyzed.
 * `rewriteModule` derives this from the TypeScript AST; the standalone entry
 * point derives it from content-tag's parse output and a lightweight scan of
 * the script (see `script-scanner.ts`).
 */
export type EmbeddedTemplate = {
  /** The template's text, as authored between the tags. */
  template: string;
  /** Offsets into the original script, in the same shape as `GlintEmitMetadata['templateLocation']`. */
  templateLocation: NonNullable<GlintEmitMetadata['templateLocation']>;
  thisBinding: TemplateThisBinding;
  /** Text emitted before / after the template's transformed output (e.g. `export default `). */
  prepend?: string | undefined;
  append?: string | undefined;
};

/**
 * How the `{{this}}` of an embedded template should be bound, based on where
 * the template sits in the surrounding module:
 *
 * - `'backing-class'`: a class-member `<template>` (the class's own template).
 *   The environment transform rewrites that form into a static block, so we
 *   look for one on the way up. Emitted as `templateForBackingValue(this, ...)`;
 *   `{{this}}` is the class instance, reached through the template context.
 *
 * - `'lexical'`: an expression template (RFC 931 implicit form) inside a class
 *   member — a field initializer or method body. Its `this` is the *lexical*
 *   `this` of its position, captured like an arrow function's, so `{{this}}`
 *   in a field initializer sees the enclosing instance. Treating these as
 *   class-backed emitted `templateForBackingValue(this, ...)` into positions
 *   where `this` is not the class constructor, which broke `Context` inference
 *   and silently typed the template's `{{this}}` as `any` (#1182).
 *
 * - `'context'`: an expression template anywhere else — module scope, a call
 *   argument, a heritage clause. `{{this}}` stays on the template context
 *   (`__glintRef__.this`) so that consumers which assign a context type to a
 *   template-only value keep working: `typeTest(context, <template>...)` from
 *   `@glint/type-test` contextually types `Context['this']` through the
 *   expected type of the `templateExpression(...)` expression, and emitting
 *   the module's lexical `this` (type `undefined`) instead severed that and
 *   broke every such type test (#1186).
 */
export type TemplateThisBinding = 'backing-class' | 'lexical' | 'context';

/**
 * Given an AST node for an embedded template, determines how the template's
 * `{{this}}` should be bound. See {@link TemplateThisBinding}.
 */
export function templateThisBinding(ts: TSLib, node: ts.Node): TemplateThisBinding {
  let current: ts.Node | null = node;
  do {
    if (ts.isClassStaticBlockDeclaration(current)) {
      return 'backing-class';
    }
    if (ts.isHeritageClause(current)) {
      return 'context';
    }
    if (ts.isClassLike(current)) {
      return 'lexical';
    }
  } while ((current = current.parent));

  return 'context';
}
