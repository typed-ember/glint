import { AST, preprocess } from '@glimmer/syntax';
import GlimmerASTMappingTree, {
  MappingSource,
  TemplateEmbedding,
} from './glimmer-ast-mapping-tree.js';
import { Directive, DirectiveKind, Range } from './transformed-module.js';
import { assert } from '../util.js';
import { CodeInformation } from '@volar/language-server/node.js';
import { codeFeatures } from './code-features.js';

/**
 * @glimmer/syntax parses identifiers as strings. Aside from meaning
 * we often have to reverse engineer location information for them
 * by hand, it also means we can't treat mappings from identifiers
 * consistently with how we treat mappings from other AST nodes.
 *
 * This class just gives us a uniform way to store identifiers
 * or other nodes as the `source` for a mapping.
 */
export class Identifier {
  public readonly type = 'Identifier';
  public constructor(public readonly name: string) {}
}

export type Mapper = {
  /**
   * Given a @glimmer/syntax AST node, returns the corresponding start
   * and end offsets of that node in the original source.
   */
  rangeForNode: (node: AST.Node) => Range;

  /**
   * Given a 0-based line number, returns the corresponding start and
   * end offsets for that line.
   */
  rangeForLine: (line: number) => Range;

  /**
   * Captures the existence of a directive specified by the given source
   * node and affecting the given range of text.
   */
  directive: (type: DirectiveKind, location: Range, areaOfEffect: Range) => void;

  // directiveTerminatingExpression: (location: Range) => void;

  /**
   * Records an error at the given location.
   */
  error: (message: string, location: Range) => void;

  /** Emit a newline in the transformed source */
  newline(): void;

  /** Increase the indent level for future emitted content */
  indent(): void;

  /** Decrease the indent level for future emitted content */
  dedent(): void;

  /** Append the given raw text to the transformed source */
  text(value: string): void;

  /**
   * Append the given raw text to the transformed source, creating
   * a 0-length mapping for it in the output.
   */
  synthetic(value: string): void;

  /**
   * Essentially the inverse of `emit.synthetic`, this notes the
   * presence of a template AST node at a given location while not
   * emitting anything in the resulting TS translation.
   */
  nothing(node: AST.Node, source?: MappingSource): void;

  /**
   * Append the given value to the transformed source, mapping
   * that span back to the given offset in the original source.
   */
  identifier(value: string, hbsOffset: number, hbsLength?: number): void;

  /**
   * Map all content emitted in the given callback to the span
   * corresponding to the given AST node in the original source.
   */
  forNode(node: AST.Node, callback: () => void, codeFeaturesForNode?: CodeInformation): void;

  /**
   * This needs to be called after any node that "consumes" a `glint-expect-error` directive.
   * This essentially marks the end of the area of effect for the directive; this helps us
   * filter out the "unused ts-expect-error" placeholder diagnostic if, in fact, an error
   * diagnostic was reported within the directive's area of effect.
   */
  terminateDirectiveAreaOfEffect(node: AST.Node): void;
};

type LocalDirective = Omit<Directive, 'source'>;

/** The result of rewriting a template */
export type RewriteResult = {
  /**
   * Any errors discovered during rewriting, along with their location
   * in terms of the original source.
   */
  errors: Array<{ message: string; location: Range | undefined }>;

  /**
   * The source code and a `MappingTree` resulting from rewriting a
   * template. If the template contains unrecoverable syntax errors,
   * this may be undefined.
   */
  result?: {
    code: string;
    directives: Array<LocalDirective>;
    mapping: GlimmerASTMappingTree;
  };
};

/**
 * Syntax surrounding the contents of a template that marks it as
 * embedded within the surrounding context, like the `hbs` tag and
 * backticks on a tagged string or the `<template>` markers in a
 * `.gts`/`.gjs` file.
 */
export type EmbeddingSyntax = {
  prefix: string;
  suffix: string;
};

export type MapTemplateContentsOptions = {
  embeddingSyntax: EmbeddingSyntax;
};

/**
 * Given the text of a handlebars template (either standalone .hbs file, or the contents
 * of an embedded `<template>...</template>` within a .gts file), invokes the given callback
 * with a set of tools to emit mapped contents corresponding to
 * that template, tracking the text emitted in order to provide
 * a mapping of ranges in the input to ranges in the output.
 */
export function mapTemplateContents(
  template: string,
  { embeddingSyntax }: MapTemplateContentsOptions,
  callback: (ast: AST.Template | null, mapper: Mapper) => void,
): RewriteResult {
  let ast: AST.Template | null = null;
  let errors: Array<{ message: string; location: Range | undefined }> = [];
  let lineOffsets = calculateLineOffsets(template, embeddingSyntax.prefix.length);
  try {
    ast = preprocess(template);
  } catch (error) {
    let message = getErrorMessage(error);
    let location: Range | undefined;
    if (isHBSSyntaxError(error)) {
      location = {
        start: lineOffsets[error.hash.loc.first_line] + error.hash.loc.first_column,
        end: lineOffsets[error.hash.loc.last_line] + error.hash.loc.last_column,
      };
    } else {
      let match = /line (\d+) : column (\d+)/.exec(message);
      if (match) {
        let offset = lineOffsets[Number(match[1])] + Number(match[2]);
        location = { start: offset, end: offset };
      }
    }

    errors.push({ message, location });
  }

  let segmentsStack: string[][] = [[]];
  let mappingsStack: GlimmerASTMappingTree[][] = [[]];
  let indent = '';
  let offset = 0;
  let directives: Array<LocalDirective> = [];

  let expectErrorToken:
    | {
        numErrors: number;
        location: Range;
        areaOfEffect: Range;
      }
    | undefined;

  // Associates all content emitted during the given callback with the
  // given range in the template source and corresponding AST node.
  // If an exception is thrown while executing the callback, the error
  // will be captured and associated with the given range, and no content
  // will be emitted.
  let captureMapping = (
    hbsRange: Range,
    source: MappingSource,
    allowEmpty: boolean,
    callback: () => void,
    codeFeaturesForNode?: CodeInformation,
  ): void => {
    let start = offset;
    let mappings: GlimmerASTMappingTree[] = [];
    let segments: string[] = [];

    segmentsStack.unshift(segments);
    mappingsStack.unshift(mappings);
    try {
      callback();
    } catch (error) {
      errors.push({ message: getErrorMessage(error), location: hbsRange });
      offset = start;
    }
    mappingsStack.shift();
    segmentsStack.shift();

    // If the offset didn't change (either because nothing was emitted
    // or because an exception was thrown), don't add a new node to the
    // mapping tree or flush any new content.
    if (start !== offset || allowEmpty) {
      let end = offset;
      let tsRange = { start, end };

      mappingsStack[0].push(
        new GlimmerASTMappingTree(
          tsRange,
          hbsRange,
          mappings,
          source,
          codeFeaturesForNode ?? codeFeatures.all,
        ),
      );
      segmentsStack[0].push(...segments);
    }
  };

  /**
   * This function is used by the codeFeaturesProxy about to conditionally enhance/augment
   * the `CodeInformation` object that we pass along with each mapping.
   *
   * In particular we use it in our implementation of `glint-expect-error` directives, wherein,
   * depending on whether an error diagnostic was reported by TS in a span of code, we need to
   * conditionally filter out the "unused ts-expect-error" placeholder diagnostic that we emit.
   */
  function resolveCodeFeatures(features: CodeInformation) {
    if (features.verification) {
      // If this code span requests verification (e.g. TS type-checking), then
      // we potentially need to decorate the `verification` value that we pass
      // back to Volar, in case we have active `glint-ignore/expect-error` directives
      // in active effect.

      // if (ignoredError) {
      // 	// We are currently in a region of code covered by a @glint-ignore directive, so don't
      // 	// even bother performing any type-checking: set verification to false.
      // 	return {
      // 		...features,
      // 		verification: false,
      // 	};
      // }

      if (expectErrorToken) {
        // We are currently in a region of code covered by a @glint-expect-error directive. We need to
        // keep track of the number of errors encountered within this region so that we can know whether
        // we will need to propagate an "unused ts-expect-error" diagnostic back to the original
        // .gts file or not.
        const token = expectErrorToken;
        return {
          ...features,
          verification: {
            shouldReport: () => {
              token.numErrors++;
              return false;
            },
          },
        };
      }
    }
    return features;
  }

  let mapper: Mapper = {
    indent() {
      indent += '  ';
    },
    dedent() {
      indent = indent.slice(2);
    },
    newline() {
      offset += 1;
      segmentsStack[0].push('\n');
    },
    text(value: string) {
      offset += value.length;
      segmentsStack[0].push(value);
    },
    synthetic(value: string) {
      if (value.length) {
        mapper.identifier(value, 0, 0);
      }
    },
    nothing(node: AST.Node, source: MappingSource = node) {
      captureMapping(mapper.rangeForNode(node), source, true, () => {});
    },
    identifier(value: string, hbsOffset: number, hbsLength = value.length) {
      let hbsRange = { start: hbsOffset, end: hbsOffset + hbsLength };
      let source = new Identifier(value);
      captureMapping(hbsRange, source, true, () => mapper.text(value));
    },
    forNode(node: AST.Node, callback: () => void) {
      captureMapping(mapper.rangeForNode(node), node, false, callback);
    },

    error(message: string, location: Range) {
      errors.push({ message, location });
    },

    directive(kind: DirectiveKind, location: Range, areaOfEffect: Range) {
      if (kind === 'expect-error') {
        if (!expectErrorToken) {
          mapper.text(`// glint: BEGIN area of effect for directive: @glint-${kind}`);
          mapper.newline();
        }

        expectErrorToken = {
          numErrors: 0,
          location,
          areaOfEffect,
        };
      }

      directives.push({ kind, location, areaOfEffect });
    },

    terminateDirectiveAreaOfEffect(node: AST.Node) {
      if (expectErrorToken) {
        // There is an active "@glint-expect-error" directive whose
        // are of effect we need to terminate.
        //
        // There is a somewhat delicate order in which everything below needs to happen,
        // but here is an outline:
        //
        // 1. Volar will call the `shouldReport` function of the `verification` object
        //    of the `CodeInformation` object that we pass along with each mapping for
        //    every diagnostic reported by TS within the transformed region of code.
        //
        // 2. This callback's main job is to return a boolean indicating whether we
        //    should propagate TS diagnostics within the transformed region of code
        //    back to search (e.g. the original .gts file). But in addition to that we are somewhat
        //    hackishly using `shouldReport` to track the number of errors encountered
        //    within the directive's area of effect so that we can later determine
        //    whether to filter out the "unused ts-expect-error" placeholder diagnostic
        //    that we emit below.
        //
        // 3. The first `shouldReport` that gets called by Volar is in `resolveCodeFeatures`;
        //    this implementation of `shouldReport` increments `numErrors` for each diagnostic
        //    found in the region.
        //
        // 4. The second `shouldReport` that gets called is below: we emit a
        //    `// @ts-expect-error - placeholder` diagnostic that is always triggering
        //    within the transformed code, and we use `shouldReport` to decide whether
        //    to filter out that diagnostic or not.
        //
        // This approach was taken from Vue tooling; it is complicated but it solves the problem
        // of keeping the code transform reasonably static while keeping all of the dynamic
        // error tracking and filtering logic in `shouldReport` callbacks.
        const token = expectErrorToken;

        const codeFeaturesForPlaceholderTsExpectError = {
          verification: {
            shouldReport: () => token.numErrors === 0,
          },
        };

        // Emit a ts-expect-error this is guaranteed to trigger because it is immediately
        // followed with an empty semi-colon statement. Wrap in a mapping with a `shouldReport`
        // callback to filter out the diagnostic if there are no errors in the area of effect.
        mapper.forNode(
          node,
          () => {
            mapper.text(`// @ts-expect-error - placeholder`);
            mapper.newline();
          },
          codeFeaturesForPlaceholderTsExpectError,
        );

        mapper.text(';');
        mapper.newline();

        expectErrorToken = undefined;

        mapper.text(`// glint: END area of effect for directive: @glint-expect-error`);
        mapper.newline();
      }
      // if (ignoredError) {
      //   ignoredError = false;
      //   yield`// @vue-ignore ${endStr}${newLine}`;
      // }
    },

    rangeForNode: buildRangeForNode(lineOffsets),

    rangeForLine: (line: number): Range => ({
      start: lineOffsets[line],
      end: lineOffsets[line + 1] ?? template.length,
    }),
  };

  callback(ast, mapper);

  assert(segmentsStack.length === 1);

  let code = segmentsStack[0].join('');

  const codeFeaturesProxy = new Proxy(codeFeatures, {
    get(target, key: keyof typeof codeFeatures) {
      const data = target[key];
      return resolveCodeFeatures(data);
    },
  });

  let mapping = new GlimmerASTMappingTree(
    { start: 0, end: code.length },
    {
      start: 0,
      end: embeddingSyntax.prefix.length + template.length + embeddingSyntax.suffix.length,
    },
    mappingsStack[0],
    new TemplateEmbedding(),
    codeFeaturesProxy.all,
  );

  return { errors, result: { code, directives, mapping } };
}

const LEADING_WHITESPACE = /^\s+/;
const TRAILING_WHITESPACE = /\s+$/;

function calculateLineOffsets(template: string, contentOffset: number): Array<number> {
  let lines = template.split('\n');
  let total = contentOffset;
  let offsets = [contentOffset];

  for (let [index, line] of lines.entries()) {
    // lines from @glimmer/syntax are 1-indexed
    offsets[index + 1] = total;
    total += line.length + 1;
  }

  return offsets;
}

function buildRangeForNode(offsets: Array<number>): (node: AST.Node) => Range {
  return (node) => {
    let { loc } = node;
    let start = offsets[loc.start.line] + loc.start.column;
    let end = offsets[loc.end.line] + loc.end.column;

    // This makes error reporting for illegal text nodes (e.g. alongside named blocks)
    // a bit nicer by only highlighting the content rather than all the surrounding
    // newlines and attendant whitespace
    if (node.type === 'TextNode') {
      let leading = LEADING_WHITESPACE.exec(node.chars)?.[0].length ?? 0;
      let trailing = TRAILING_WHITESPACE.exec(node.chars)?.[0].length ?? 0;

      if (leading !== node.chars.length) {
        start += leading;
        end -= trailing;
      }
    }

    return { start, end };
  };
}

interface HBSSyntaxError extends Error {
  hash: {
    text: string;
    token: string;
    line: number;
    loc: {
      first_line: number;
      last_line: number;
      first_column: number;
      last_column: number;
    };
  };
}

function getErrorMessage(error: unknown): string {
  return (error as any)?.message ?? '(unknown error)';
}

function isHBSSyntaxError(error: unknown): error is HBSSyntaxError {
  if (typeof error === 'object' && !!error && 'hash' in error) {
    let { hash } = error as any;
    return typeof hash?.loc === 'object';
  }

  return false;
}
