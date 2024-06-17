import MappingTree from './mapping-tree.js';
import { assert } from '../util.js';

export type Range = { start: number; end: number };
export type RangeWithMapping = Range & { mapping?: MappingTree };
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
  /** A mapping of offsets within this span between its original and transformed versions */
  mapping?: MappingTree;
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
 * It can be queried with an offset or range in either the
 * original or transformed source to determine the corresponding
 * offset or range in the other.
 */
export default class TransformedModule {
  public constructor(
    public readonly transformedContents: string,
    public readonly errors: ReadonlyArray<TransformError>,
    public readonly directives: ReadonlyArray<Directive>,
    private readonly correlatedSpans: Array<CorrelatedSpan>
  ) {}

  public toDebugString(): string {
    let mappingStrings = this.correlatedSpans.map((span) =>
      span.mapping?.toDebugString({
        originalStart: span.originalStart,
        originalSource: span.originalFile.contents.slice(
          span.originalStart,
          span.originalStart + span.originalLength
        ),
        transformedStart: span.transformedStart,
        transformedSource: span.transformedSource,
      })
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
    transformedEnd: number
  ): RangeWithMappingAndSource {
    let startInfo = this.determineOriginalOffsetAndSpan(transformedStart);
    let endInfo = this.determineOriginalOffsetAndSpan(transformedEnd);

    assert(
      startInfo.correlatedSpan.originalFile === endInfo.correlatedSpan.originalFile,
      'Attempted to transform a range across two different files'
    );

    let source = startInfo.correlatedSpan.originalFile;
    let start = startInfo.originalOffset;
    let end = endInfo.originalOffset;

    if (startInfo.correlatedSpan === endInfo.correlatedSpan) {
      let { correlatedSpan } = startInfo;
      let mapping = correlatedSpan.mapping?.narrowestMappingForTransformedRange({
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
    originalEnd: number
  ): RangeWithMapping {
    let startInfo = this.determineTransformedOffsetAndSpan(originalFileName, originalStart);
    let endInfo = this.determineTransformedOffsetAndSpan(originalFileName, originalEnd);

    let start = startInfo.transformedOffset;
    let end = endInfo.transformedOffset;

    if (startInfo.correlatedSpan && startInfo.correlatedSpan === endInfo.correlatedSpan) {
      let { correlatedSpan } = startInfo;
      let mapping = correlatedSpan.mapping?.narrowestMappingForOriginalRange({
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
    originalOffset: number
  ): { originalContentStart: number; originalContentEnd: number; originalContent: string } | null {
    let { correlatedSpan } = this.determineTransformedOffsetAndSpan(
      originalFileName,
      originalOffset
    );

    if (!correlatedSpan.mapping) {
      return null;
    }

    let templateMapping = correlatedSpan.mapping?.children[0];

    assert(
      correlatedSpan.mapping?.sourceNode.type === 'TemplateEmbedding' &&
        templateMapping?.sourceNode.type === 'Template',
      'Internal error: unexpected mapping structure.' + ` (${templateMapping?.sourceNode.type})`
    );

    let originalContentStart = correlatedSpan.originalStart + templateMapping.originalRange.start;
    let originalContentEnd = correlatedSpan.originalStart + templateMapping.originalRange.end;
    let originalContent = correlatedSpan.originalFile.contents.slice(
      originalContentStart,
      originalContentEnd
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
    originalOffset: number
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
   * (e.g. `{{expectsAtLeastOneArg}}` in an .hbs file to `χ.emitContent(χ.resolveOrReturn(expectsAtLeastOneArg)());`
   * in a generated TS file, in Volar you can only map regions of the same size.
   * 
   * In the case that you need to map regions of different sizes in Volar, you need to also using
   * zero-length mappings to delineate regions/boundaries that should map to each other, otherwise there will
   * be cases where TS diagnostics will fail to transform/map back to the original source. Example:
   * 
   * - `{{[[ZEROLEN-A]][[expectsAtLeastOneArg]][[ZEROLEN-B]]}}`
   * - to
   * - `[[ZEROLEN-A]]χ.emitContent(χ.resolveOrReturn([[expectsAtLeastOneArg]])());[[ZEROLEN-B]]`
   */
  public toVolarMappings() {
    const sourceOffsets: number[] = [];
    const generatedOffsets: number[] = [];
    const lengths: number[] = [];

    let recurse = (span: CorrelatedSpan, mapping: MappingTree) => {
      const children = mapping.children;
      if (children.length === 0) {
        let { originalRange, transformedRange } = mapping;
        let hbsStart = span.originalStart + originalRange.start;
        let hbsEnd = span.originalStart + originalRange.end;
        let tsStart = span.transformedStart + transformedRange.start;
        let tsEnd = span.transformedStart + transformedRange.end;
        const length = hbsEnd - hbsStart;
        // assert(length === tsEnd - tsStart, 'span length mismatch for leaf mapping');
        if (length === tsEnd - tsStart) {
          // (Hacky?) assumption: because TS and HBS span lengths are equivalent,
          // then this is a simple leafmost mapping, e.g. `{{this.[foo]}}` -> `this.[foo]`
          sourceOffsets.push(hbsStart);
          generatedOffsets.push(tsStart);
          lengths.push(length);
        } else {
          // This isn't common but there are a few cases where we are not currently going as
          // "deep" as we good into the mapping tree to produce equal-size leaf nodes; here
          // is one example (using `toDebugString()`)
          //
          // | | | Mapping: MustacheStatement
          // | | |  hbs(686:723): {{yield to="expectsAtLeastOneParam"}}
          // | | |  ts(1025:1073):χ.yieldToBlock(𝚪, "expectsAtLeastOneParam")()

          // It may make sense to rework the mappings for yields and other cases so that
          // the leaf nodes are equal-sized identifiers
          // (e.g. expectsAtLeastOneParam (hbs) -> expectsAtLeastOneParam(ts) ), but
          // in the mean time we will just produce zero-length boundary markers for Volar.
        }
      } else {
        mapping.children.forEach((child) => {
          recurse(span, child);
        });
      }
    };

    this.correlatedSpans.forEach((span) => {
      if (span.mapping) {
        // this span is transformation from embedded <template> to TS.

        recurse(span, span.mapping);
      } else {
        // untransformed TS code (between <template> tags). Because there's no
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
          sourceOffsets.push(span.originalStart);
          generatedOffsets.push(span.transformedStart);
          lengths.push(span.originalLength);
        }
      }
    });

    return [
      {
        // sourceOffsets: [],
        // generatedOffsets: [],
        // lengths: [],

        // Hacked hardwired values for now.
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
        },
      },
    ];
  }
}
