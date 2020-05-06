import { AST } from '@glimmer/syntax';
import { Range } from './transformed-module';
import { Identifier } from './map-template-contents';

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
export default class MappingTree {
  public constructor(
    public transformedRange: Range,
    public originalRange: Range,
    public children: Array<MappingTree> = [],
    public sourceNode: AST.Node | Identifier
  ) {}

  /**
   * Returns the mapping corresponding to the smallest span in the transformed source
   * that contains the given range, or `null` if that range doesn't fall within
   * this mapping tree.
   */
  public narrowestMappingForTransformedRange(range: Range): MappingTree | null {
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
  public narrowestMappingForOriginalRange(range: Range): MappingTree | null {
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

  public toDebugString(originalSource: string, transformedSource: string, indent = '| '): string {
    let { sourceNode, originalRange, transformedRange, children } = this;
    let lines = [];

    lines.push(`${indent}Mapping: ${sourceNode.type}`);

    lines.push(
      `${indent}${` hbs(${originalRange.start}:${originalRange.end}):`.padEnd(
        15
      )}${originalSource
        .slice(originalRange.start, originalRange.end)
        .trim()
        .replace(/\n/g, '\\n')}`
    );

    lines.push(
      `${indent}${` ts(${transformedRange.start}:${transformedRange.end}):`.padEnd(
        15
      )}${transformedSource
        .slice(transformedRange.start, transformedRange.end)
        .trim()
        .replace(/\n/g, '\\n')}`
    );

    lines.push(indent);

    for (let child of children) {
      lines.push(child.toDebugString(originalSource, transformedSource, indent + '| '));
    }

    if (children.length) {
      lines.push(indent);
    }

    return lines.join('\n');
  }
}
