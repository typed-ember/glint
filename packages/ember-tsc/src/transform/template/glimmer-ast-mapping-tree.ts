import { AST } from '@glimmer/syntax';
import { Range } from './transformed-module.js';
import { Identifier } from './map-template-contents.js';
import { CodeInformation } from '@volar/language-server/node.js';

export type MappingSource = AST.Node | TemplateEmbedding | TextContent | Identifier | ParseError;

/**
 * In cases where we're unable to parse a template, we still want to
 * be able to hold a placeholder mapping so that we can respond sensibly
 * to offset transformation queries. This class acts as a standin for
 * the proper AST node we were unable to obtain in such cases.
 */
export class ParseError {
  public readonly type = 'ParseError';
}

/**
 * The Glimmer AST uses `TextNode` for both string arg values on elements
 * and for top-level text content floating in the DOM itself. Since we
 * want to treat the two differently (namely, string args may have useful
 * completion suggestions but plain text doesn't), we use a stand-in
 * node for the latter.
 */
export class TextContent {
  public readonly type = 'TextContent';
}

/**
 * This node represents the root of an embedded template, including
 * the surrounding `<template>...</template>` boilerplate that designates
 * the surrounded contents as a template.
 */
export class TemplateEmbedding {
  public readonly type = 'TemplateEmbedding';
}

/**
 * A `MappingTree` maintains a hierarchy of mappings between ranges of
 * locations in original and transformed source strings. These mappings
 * are naturally hierarchical due to the tree structure of the underlying
 * code.
 *
 * For instance, given an expression like `{{foo.bar}}` in a template, a
 * corresponding expression in TypeScript might be `foo?.bar`. The individual
 * identifiers `foo` and `bar` map directly to one another, but the full
 * expressions do as well. By maintaining a full hierarchy of these mappings,
 * we can always report diagnostics in the template at roughly the same
 * level of granularity as TS itself uses when reporting on the transformed
 * output.
 */
export default class GlimmerASTMappingTree {
  public parent: GlimmerASTMappingTree | null = null;

  public constructor(
    public transformedRange: Range,
    public originalRange: Range,
    public children: Array<GlimmerASTMappingTree> = [],
    public sourceNode: MappingSource,
    public codeInformation?: CodeInformation,
  ) {
    children.forEach((child) => (child.parent = this));
  }

  /**
   * Returns the mapping corresponding to the smallest span in the transformed source
   * that contains the given range, or `null` if that range doesn't fall within
   * this mapping tree.
   */
  public narrowestMappingForTransformedRange(range: Range): GlimmerASTMappingTree | null {
    if (range.start < this.transformedRange.start || range.end > this.transformedRange.end) {
      return null;
    }

    for (let child of this.children) {
      let mapping = child.narrowestMappingForTransformedRange(range);
      if (mapping) {
        return mapping;
      }
    }

    return this;
  }

  /**
   * Returns the mapping corresponding to the smallest span in the original source
   * that contains the given range, or `null` if that range doesn't fall within
   * this mapping tree.
   */
  public narrowestMappingForOriginalRange(range: Range): GlimmerASTMappingTree | null {
    if (range.start < this.originalRange.start || range.end > this.originalRange.end) {
      return null;
    }

    for (let child of this.children) {
      let mapping = child.narrowestMappingForOriginalRange(range);
      if (mapping) {
        return mapping;
      }
    }

    return this;
  }

  /**
   * Returns all mappings that exactly match the provided range.
   */
  public exactMappingsForOriginalRange(range: Range): GlimmerASTMappingTree[] {
    const results: GlimmerASTMappingTree[] = [];

    if (range.start < this.originalRange.start || range.end > this.originalRange.end) {
      return results;
    }

    if (range.start == this.originalRange.start && range.end == this.originalRange.end) {
      results.push(this);
    }

    for (let child of this.children) {
      results.push(...child.exactMappingsForOriginalRange(range));
    }

    return results;
  }

  public toDebugString(options: {
    originalStart: number;
    originalSource: string;
    transformedStart: number;
    transformedSource: string;
    indent?: string;
  }): string {
    let { originalSource, transformedSource, indent = '| ' } = options;
    let { sourceNode, originalRange, transformedRange, children } = this;
    let hbsStart = options.originalStart + originalRange.start;
    let hbsEnd = options.originalStart + originalRange.end;
    let tsStart = options.transformedStart + transformedRange.start;
    let tsEnd = options.transformedStart + transformedRange.end;
    let lines = [];

    lines.push(`${indent}Mapping: ${sourceNode.type}`);

    lines.push(
      `${indent}${` hbs(${hbsStart}:${hbsEnd}):`.padEnd(15)}${this.getSourceRange(
        originalSource,
        originalRange,
      )}`,
    );

    lines.push(
      `${indent}${` ts(${tsStart}:${tsEnd}):`.padEnd(15)}${this.getSourceRange(
        transformedSource,
        transformedRange,
      )}`,
    );

    lines.push(indent);

    for (let child of children) {
      lines.push(child.toDebugString({ ...options, indent: indent + '| ' }));
    }

    if (children.length) {
      lines.push(indent);
    }

    return lines.map((line) => line.trimEnd()).join('\n');
  }

  private getSourceRange(source: string, range: Range): string {
    return source.slice(range.start, range.end).trim().replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  }
}
