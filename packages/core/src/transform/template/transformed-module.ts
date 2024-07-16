import GlimmerASTMappingTree from './glimmer-ast-mapping-tree.js';
import { assert } from '../util.js';
import { CodeMapping } from '@volar/language-core';

export type Range = { start: number; end: number };
export type RangeWithMapping = Range & { mapping?: GlimmerASTMappingTree };
export type RangeWithMappingAndSource = RangeWithMapping & { source: SourceFile };

export type CorrelatedSpan = {
  /** Where this span of content originated */
  originalFile: SourceFile;
  /** The offset where this content began in its original source */
  originalStart: number;
  /** The length of this span's content in its original source */
  originalLength: number;
  /** The location in the untransformed source where this span is spliced in */
  insertionPoint: number;
  /** The contents of this span in the transformed output */
  transformedSource: string;
  /** The offset in the transformed output of this span */
  transformedStart: number;
  /** The length of this span in the transformed output */
  transformedLength: number;
  /** (Glimmer/Handlebars spans only:) A mapping of offsets within this span between its original and transformed versions */
  glimmerAstMapping?: GlimmerASTMappingTree;
};

export type DirectiveKind = 'ignore' | 'expect-error';
export type Directive = {
  kind: DirectiveKind;
  source: SourceFile;
  location: Range;
  areaOfEffect: Range;
};

export type TransformError = {
  isContentTagError?: boolean;
  message: string;
  location: Range;
  source: SourceFile;
};

export type SourceFile = {
  filename: string;
  contents: string;
};

/**
 * This class represents the result of transforming a TypeScript
 * module with one or more embedded HBS templates. It contains
 * both the original and transformed source text of the module, as
 * well any errors encountered during transformation.
 *
 * It is used heavily for bidirectional source mapping between the original TS/HBS code
 * and the singular transformed TS output (aka the Intermediate Representation).
 * It can be queried with an offset or range in either the
 * original or transformed source to determine the corresponding
 * offset or range in the other.
 */
export default class TransformedModule {
  public constructor(
    public readonly transformedContents: string,
    public readonly errors: ReadonlyArray<TransformError>,
    public readonly directives: ReadonlyArray<Directive>,
    private readonly correlatedSpans: Array<CorrelatedSpan>,
  ) {}

  public toDebugString(): string {
    let mappingStrings = this.correlatedSpans.map((span) =>
      span.glimmerAstMapping?.toDebugString({
        originalStart: span.originalStart,
        originalSource: span.originalFile.contents.slice(
          span.originalStart,
          span.originalStart + span.originalLength,
        ),
        transformedStart: span.transformedStart,
        transformedSource: span.transformedSource,
      }),
    );

    return `TransformedModule\n\n${mappingStrings.filter(Boolean).join('\n\n')}`;
  }

  public getOriginalOffset(transformedOffset: number): { source?: SourceFile; offset: number } {
    let { start, source } = this.getOriginalRange(transformedOffset, transformedOffset);
    return { source, offset: start };
  }

  public getTransformedOffset(originalFileName: string, originalOffset: number): number {
    return this.getTransformedRange(originalFileName, originalOffset, originalOffset).start;
  }

  public getOriginalRange(
    transformedStart: number,
    transformedEnd: number,
  ): RangeWithMappingAndSource {
    let startInfo = this.determineOriginalOffsetAndSpan(transformedStart);
    let endInfo = this.determineOriginalOffsetAndSpan(transformedEnd);

    assert(
      startInfo.correlatedSpan.originalFile === endInfo.correlatedSpan.originalFile,
      'Attempted to transform a range across two different files',
    );

    let source = startInfo.correlatedSpan.originalFile;
    let start = startInfo.originalOffset;
    let end = endInfo.originalOffset;

    if (startInfo.correlatedSpan === endInfo.correlatedSpan) {
      let { correlatedSpan } = startInfo;
      let mapping = correlatedSpan.glimmerAstMapping?.narrowestMappingForTransformedRange({
        start: start - correlatedSpan.originalStart,
        end: end - correlatedSpan.originalStart,
      });

      if (mapping) {
        let start = correlatedSpan.originalStart + mapping.originalRange.start;
        let end = correlatedSpan.originalStart + mapping.originalRange.end;
        return { mapping, start, end, source };
      }
    }

    return { start, end, source };
  }

  public getTransformedRange(
    originalFileName: string,
    originalStart: number,
    originalEnd: number,
  ): RangeWithMapping {
    let startInfo = this.determineTransformedOffsetAndSpan(originalFileName, originalStart);
    let endInfo = this.determineTransformedOffsetAndSpan(originalFileName, originalEnd);

    let start = startInfo.transformedOffset;
    let end = endInfo.transformedOffset;

    if (startInfo.correlatedSpan && startInfo.correlatedSpan === endInfo.correlatedSpan) {
      let { correlatedSpan } = startInfo;
      let mapping = correlatedSpan.glimmerAstMapping?.narrowestMappingForOriginalRange({
        start: start - correlatedSpan.transformedStart,
        end: end - correlatedSpan.transformedStart,
      });

      if (mapping) {
        let start = correlatedSpan.transformedStart + mapping.transformedRange.start;
        let end = correlatedSpan.transformedStart + mapping.transformedRange.end;
        return { mapping, start, end };
      }
    }

    return { start, end };
  }

  public findTemplateAtOriginalOffset(
    originalFileName: string,
    originalOffset: number,
  ): { originalContentStart: number; originalContentEnd: number; originalContent: string } | null {
    let { correlatedSpan } = this.determineTransformedOffsetAndSpan(
      originalFileName,
      originalOffset,
    );

    if (!correlatedSpan.glimmerAstMapping) {
      return null;
    }

    let templateMapping = correlatedSpan.glimmerAstMapping?.children[0];

    assert(
      correlatedSpan.glimmerAstMapping?.sourceNode.type === 'TemplateEmbedding' &&
        templateMapping?.sourceNode.type === 'Template',
      'Internal error: unexpected mapping structure.' + ` (${templateMapping?.sourceNode.type})`,
    );

    let originalContentStart = correlatedSpan.originalStart + templateMapping.originalRange.start;
    let originalContentEnd = correlatedSpan.originalStart + templateMapping.originalRange.end;
    let originalContent = correlatedSpan.originalFile.contents.slice(
      originalContentStart,
      originalContentEnd,
    );

    return { originalContentStart, originalContentEnd, originalContent };
  }

  private determineOriginalOffsetAndSpan(transformedOffset: number): {
    originalOffset: number;
    correlatedSpan: CorrelatedSpan;
  } {
    for (let span of this.correlatedSpans) {
      if (
        transformedOffset >= span.transformedStart &&
        transformedOffset <= span.transformedStart + span.transformedLength
      ) {
        return {
          originalOffset: transformedOffset - span.transformedStart + span.originalStart,
          correlatedSpan: span,
        };
      }
    }

    assert(false, 'Internal error: offset out of bounds');
  }

  private determineTransformedOffsetAndSpan(
    originalFileName: string,
    originalOffset: number,
  ): { transformedOffset: number; correlatedSpan: CorrelatedSpan } {
    for (let span of this.correlatedSpans) {
      if (
        span.originalFile.filename === originalFileName &&
        originalOffset >= span.originalStart &&
        originalOffset < span.originalStart + span.originalLength
      ) {
        return {
          transformedOffset: originalOffset - span.originalStart + span.transformedStart,
          correlatedSpan: span,
        };
      }
    }

    assert(false, 'Internal error: offset out of bounds');
  }

  /**
   * Converts the mappings in this transformed module to the format expected by Volar.
   *
   * The main difference between the two formats is that while the classic Glint transformation
   * mappings support mapping a differently sized source region to a differently sized target region
   * (e.g. `{{expectsAtLeastOneArg}}` in an .hbs file to `__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(expectsAtLeastOneArg)());`
   * in a generated TS file, in Volar you can only map regions of the same size.
   *
   * In the case that you need to map regions of different sizes in Volar, you need to also using
   * zero-length mappings to delineate regions/boundaries that should map to each other, otherwise there will
   * be cases where TS diagnostics will fail to transform/map back to the original source. Example:
   *
   * - `{{[[ZEROLEN-A]][[expectsAtLeastOneArg]][[ZEROLEN-B]]}}`
   * - to
   * - `[[ZEROLEN-A]]__glintDSL__.emitContent(__glintDSL__.resolveOrReturn([[expectsAtLeastOneArg]])());[[ZEROLEN-B]]`
   */
  public toVolarMappings(filenameFilter?: string): CodeMapping[] {
    const sourceOffsets: number[] = [];
    const generatedOffsets: number[] = [];
    const lengths: number[] = [];

    const push = (sourceOffset: number, generatedOffset: number, length: number): void => {
      if (sourceOffsets.length > 0) {
        // TODO: these assertions are firing for certain files/transformations, which means
        // we're emitting unsorted mappings, which means volar has to fall back to an inefficient
        // source mapping algorithm rather than using binary search:
        // https://github.com/volarjs/volar.js/blob/3798f27684f5c671f06bf7a19e32bc489e652e14/packages/source-map/lib/translateOffset.ts#L18
        //
        // The fix for this is probably somewhere in the `template-to-typescript.ts` file, but I
        // don't have a sense for how complicated that'll be.
        // assert(
        //   sourceOffset >= sourceOffsets[sourceOffsets.length - 1],
        //   'Source offsets should be monotonically increasing',
        // );
        // assert(
        //   generatedOffset >= generatedOffsets[generatedOffsets.length - 1],
        //   'Generated offsets should be monotonically increasing',
        // );
      }

      sourceOffsets.push(sourceOffset);
      generatedOffsets.push(generatedOffset);
      lengths.push(length);
    };

    let recurse = (span: CorrelatedSpan, mapping: GlimmerASTMappingTree): void => {
      const children = mapping.children;
      let { originalRange, transformedRange } = mapping;
      let hbsStart = span.originalStart + originalRange.start;
      let hbsEnd = span.originalStart + originalRange.end;
      let tsStart = span.transformedStart + transformedRange.start;
      let tsEnd = span.transformedStart + transformedRange.end;

      if (children.length === 0) {
        // leaf node
        const hbsLength = hbsEnd - hbsStart;
        const tsLength = tsEnd - tsStart;
        if (hbsLength === tsLength) {
          // (Hacky?) assumption: because TS and HBS span lengths are equivalent,
          // then this is a simple leafmost mapping, e.g. `{{this.[foo]}}` -> `this.[foo]`
          push(hbsStart, tsStart, hbsLength);
        } else {
          // Disregard the "null zone" mappings, i.e. cases where TS code maps to empty HBS code
          if (hbsLength > 0 && tsLength > 0) {
            push(hbsStart, tsStart, 0);
            push(hbsEnd, tsEnd, 0);
          }
        }
      } else {
        push(hbsStart, tsStart, 0);

        mapping.children.forEach((child) => {
          recurse(span, child);
        });

        push(hbsEnd, tsEnd, 0);
      }
    };

    this.correlatedSpans.forEach((span) => {
      if (filenameFilter && span.originalFile.filename !== filenameFilter) {
        return;
      }

      if (span.glimmerAstMapping) {
        // this span is transformation from HBS to TS (either the replaced contents
        // within `<template>` tags in a .gts file, or the inserted and transformed
        // contents of a companion .hbs file in loose mode)
        recurse(span, span.glimmerAstMapping);
      } else {
        // this span is untransformed TS content. Because there's no
        // transformation, we expect these to be the same length (in fact, they
        // should be the same string entirely)

        // This assertion seemed valid when parsing .gts files with extracted hbs in <template> tags,
        // but when parsing solo .hbs files in loose mode there were cases where, e.g.,
        // originalLength == 0 and transformLength == 1;
        // assert(
        //   span.originalLength === span.transformedLength,
        //   'span length mismatch for untransformed content'
        // );

        if (span.originalLength === span.transformedLength) {
          push(span.originalStart, span.transformedStart, span.originalLength);
        }
      }
    });

    return [
      {
        sourceOffsets,
        generatedOffsets,
        lengths,

        data: {
          completion: true,
          format: false,
          navigation: true,
          semantic: true,
          structure: true,
          verification: true,
          transformedContents: this.transformedContents, // TODO REMOVE
        } as any,
      },
    ];
  }
}
