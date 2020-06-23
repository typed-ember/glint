import MappingTree from './mapping-tree';

export type Range = { start: number; end: number };
export type RangeWithMapping = Range & { mapping?: MappingTree };
export type ReplacedSpan = {
  originalStart: number;
  originalLength: number;
  transformedStart: number;
  transformedLength: number;
  transformedSource: string;
  mapping: MappingTree;
};

export type TransformError = {
  message: string;
  location: Range;
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
    public readonly filename: string,
    public readonly originalSource: string,
    public readonly transformedSource: string,
    public readonly errors: ReadonlyArray<TransformError>,
    private readonly replacedSpans: Array<ReplacedSpan>
  ) {}

  public toDebugString(): string {
    let mappingStrings = this.replacedSpans.map((span) =>
      span.mapping.toDebugString(
        this.originalSource.slice(span.originalStart, span.originalStart + span.originalLength),
        span.transformedSource
      )
    );

    return `TransformedModule ${this.filename}\n\n${mappingStrings.join('\n\n')}`;
  }

  public getOriginalOffset(transformedOffset: number): number {
    return this.getOriginalRange(transformedOffset, transformedOffset).start;
  }

  public getTransformedOffset(originalOffset: number): number {
    return this.getTransformedRange(originalOffset, originalOffset).start;
  }

  public getOriginalRange(transformedStart: number, transformedEnd: number): RangeWithMapping {
    let startInfo = this.determineOriginalOffsetAndSpan(transformedStart);
    let endInfo = this.determineOriginalOffsetAndSpan(transformedEnd);

    let start = startInfo.originalOffset;
    let end = endInfo.originalOffset;

    if (startInfo.replacedSpan && startInfo.replacedSpan === endInfo.replacedSpan) {
      let { replacedSpan } = startInfo;
      let mapping = replacedSpan?.mapping?.narrowestMappingForTransformedRange({
        start: start - replacedSpan.originalStart,
        end: end - replacedSpan.originalStart,
      });

      if (replacedSpan && mapping) {
        let start = replacedSpan.originalStart + mapping.originalRange.start;
        let end = replacedSpan.originalStart + mapping.originalRange.end;
        return { mapping, start, end };
      }
    }

    return { start, end };
  }

  public getTransformedRange(originalStart: number, originalEnd: number): RangeWithMapping {
    let startInfo = this.determineTransformedOffsetAndSpan(originalStart);
    let endInfo = this.determineTransformedOffsetAndSpan(originalEnd);

    let start = startInfo.transformedOffset;
    let end = endInfo.transformedOffset;

    if (startInfo.replacedSpan && startInfo.replacedSpan === endInfo.replacedSpan) {
      let { replacedSpan } = startInfo;
      let mapping = replacedSpan?.mapping?.narrowestMappingForOriginalRange({
        start: start - replacedSpan.transformedStart,
        end: end - replacedSpan.transformedStart,
      });

      if (replacedSpan && mapping) {
        let start = replacedSpan.transformedStart + mapping.transformedRange.start;
        let end = replacedSpan.transformedStart + mapping.transformedRange.end;
        return { mapping, start, end };
      }
    }

    return { start, end };
  }

  private determineOriginalOffsetAndSpan(
    transformedOffset: number
  ): { originalOffset: number; replacedSpan?: ReplacedSpan } {
    let originalOffset = transformedOffset;
    for (let span of this.replacedSpans) {
      if (
        originalOffset >= span.originalStart &&
        originalOffset <= span.originalStart + span.transformedSource.length
      ) {
        return { originalOffset, replacedSpan: span };
      } else if (originalOffset > span.originalStart) {
        originalOffset -= span.transformedSource.length - span.originalLength;
      }
    }
    return { originalOffset };
  }

  private determineTransformedOffsetAndSpan(
    originalOffset: number
  ): { transformedOffset: number; replacedSpan?: ReplacedSpan } {
    let transformedOffset = originalOffset;
    for (let span of this.replacedSpans) {
      if (
        originalOffset >= span.originalStart &&
        originalOffset <= span.originalStart + span.originalLength
      ) {
        return { transformedOffset, replacedSpan: span };
      } else if (originalOffset > span.originalStart) {
        transformedOffset += span.transformedSource.length - span.originalLength;
      }
    }
    return { transformedOffset };
  }
}
