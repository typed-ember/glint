import { GlintEmitMetadata } from '@glint/ember-tsc/config-types';
import * as path from 'node:path';
import type ts from 'typescript';
import { GlintEnvironment } from '../../config/index.js';
import { assert, TSLib } from '../util.js';

import { CorrelatedSpansResult, PartialCorrelatedSpan } from './inlining/index.js';
import { calculateTaggedTemplateSpans } from './inlining/tagged-strings.js';
import TransformedModule, {
  CorrelatedSpan,
  Directive,
  SourceFile,
  TransformError,
} from './transformed-module.js';

/**
 * Input to the process of rewriting a template, containing:
 *   script: the backing JS/TS module for a component, which may contain
 *           embedded templates depending on the environment
 */
export type RewriteInput = { script: SourceFile };

/**
 * Given the script and/or template that together comprise a component module,
 * returns a `TransformedModule` representing the combined result, with the
 * template(s), either alongside or inline, rewritten into equivalent TypeScript
 * in terms of the active glint environment's exported types.
 *
 * May return `null` if an unrecoverable parse error occurs or if there is
 * no transformation to be done.
 */
export function rewriteModule(
  ts: TSLib,
  { script }: RewriteInput,
  environment: GlintEnvironment,
  clientId?: string,
): TransformedModule | null {
  let { errors, directives, partialSpans } = calculateCorrelatedSpans(
    ts,
    script,
    environment,
    clientId,
  );

  if (!partialSpans.length && !errors.length) {
    return null;
  }

  let sparseSpans = completeCorrelatedSpans(partialSpans);
  let { contents, correlatedSpans } = calculateTransformedSource(script, sparseSpans, directives);

  return new TransformedModule(contents, errors, directives, correlatedSpans, script.filename);
}

/**
 * Locates any embedded templates in the given AST and returns a corresponding
 * `PartialCorrelatedSpan` for each, as well as any errors encountered. These
 * spans are then used in `rewriteModule` above to calculate the full set of
 * source-to-source location information as well as the final transformed source
 * string.
 */
function calculateCorrelatedSpans(
  ts: TSLib,
  script: SourceFile,
  environment: GlintEnvironment,
  clientId?: string,
): CorrelatedSpansResult {
  let directives: Array<Directive> = [];
  let errors: Array<TransformError> = [];

  let partialSpans: Array<PartialCorrelatedSpan> = [];

  if (clientId === 'tsserver-plugin') {
    partialSpans.push(generateAutoImportAnchor(script));
  }

  let { ast, emitMetadata, error } = parseScript(ts, script, environment);

  if (error) {
    if (typeof error === 'string') {
      errors.push({
        message: error,
        location: { start: 0, end: script.contents.length - 1 },
        source: script,
      });
    } else if ('isContentTagError' in error && error.isContentTagError) {
      // these lines exclude the line with the error, because
      // adding the column offset will get us on to the line with the error
      let lines = script.contents.split('\n').slice(0, error.line);
      let start = lines.reduce((sum, line) => sum + line.length, 0) + error.column - 1;
      let end = start + 1;

      errors.push({
        isContentTagError: true,
        // we have to show the "help" because content-tag has different line numbers
        // than we are able to discern ourselves.
        message: error.message + '\n\n' + error.help,
        source: script,
        location: {
          start,
          end,
        },
      });
    }

    // We've hit a parsing error, so we need to immediately return as the parsed
    // document must be correct before we can continue.
    return { errors, directives, partialSpans };
  }

  ts.transform(ast, [
    (context) =>
      function visit<T extends ts.Node>(node: T): T {
        // Here we look for ```hbs``` tagged template expressions, originally introduced
        // in the now-removed GlimmerX environment. We can consider getting rid of this, but
        // then again there are still some use cases in the wild (e.g. Glimmer Next / GXT)
        // where have tagged templates closing over outer scope is desirable:
        // https://github.com/lifeart/glimmer-next/tree/master/glint-environment-gxt
        // https://discord.com/channels/480462759797063690/717767358743183412/1259061848632721480
        if (ts.isTaggedTemplateExpression(node)) {
          let meta = emitMetadata.get(node);
          let result = calculateTaggedTemplateSpans(ts, node, meta, script, environment);

          directives.push(...result.directives);
          errors.push(...result.errors);
          partialSpans.push(...result.partialSpans);
        } else if (ts.isModuleDeclaration(node)) {
          // don't traverse into declare module
          return node;
        }

        return ts.visitEachChild(node, visit, context);
      },
  ]);

  return { errors, directives, partialSpans };
}

type ParseError =
  | string
  | {
      isContentTagError: true;
      message: string;
      line: number;
      column: number;
      file: string;
      help: string;
      raw: string;
    };

type ParseResult = {
  ast: ts.SourceFile;
  emitMetadata: WeakMap<ts.Node, GlintEmitMetadata>;
  error?: ParseError;
};

function parseScript(ts: TSLib, script: SourceFile, environment: GlintEnvironment): ParseResult {
  let { filename, contents } = script;
  let extension = path.extname(filename);
  let emitMetadata = new WeakMap<ts.Node, GlintEmitMetadata>();
  let setEmitMetadata = (node: ts.Node, data: GlintEmitMetadata): void =>
    void emitMetadata.set(node, Object.assign(emitMetadata.get(node) ?? {}, data));

  let { preprocess, transform } = environment.getConfigForExtension(extension) ?? {};

  let original: {
    contents: string;
    data?: {
      // SAFETY: type exists elsewhere (the environments)
      templateLocations: any[];
    };
  } = { contents, data: { templateLocations: [] } };

  let preprocessed = original;
  let error: ParseError | undefined;

  try {
    preprocessed = preprocess?.(contents, filename) ?? original;
  } catch (e) {
    error = parseError(e, filename);
  }

  let ast = ts.createSourceFile(
    filename,
    // contents will be transformed and placeholder'd content
    // or, in the event of a parse error, the original content
    // in which case, TS will report a ton of errors about some goofy syntax.
    // We'll want to ignore all of that and only display our parsing error from content-tag.
    preprocessed.contents,
    ts.ScriptTarget.Latest,
    true, // setParentNodes
  );

  // Only transform if we don't have a parse error
  if (!error && transform) {
    let { transformed } = ts.transform(ast, [
      (context) => transform!(preprocessed.data, { ts, context, setEmitMetadata }),
    ]);

    assert(transformed.length === 1 && ts.isSourceFile(transformed[0]));
    ast = transformed[0];
  }

  return { ast, emitMetadata, error };
}

function parseError(e: unknown, filename: string): ParseError {
  if (typeof e === 'object' && e !== null) {
    // Parse Errors from the rust parser
    if ('source_code' in e) {
      // We remove the blank links in the error because swc
      // pads errors with a leading and trailing blank line.
      // the error is typically meant for the terminal, so making it
      // stand out a bit more is a good, but that's more a presentation
      // concern than just pure error information (which is what we need).
      // @ts-expect-error object / property narrowing isn't available until TS 5.1
      let lines = e.source_code.split('\n').filter(Boolean);
      // Example:
      // '  × Unexpected eof'
      // '   ╭─[/home/nullvoxpopuli/Development/OpenSource/glint/test-packages/ts-template-imports-app/src/index.gts:6:1]'
      // ' 6 │ '
      // ' 7 │ export const X = <tem'
      // '   ╰────'
      let raw = lines.join('\n');
      let message = lines[0].replace('×', '').trim();
      let info = lines[1];
      // a filename may have numbers in it, so we want to remove the filename
      // before regex searching for numbers at the end of this line
      let strippedInfo = info.replace(filename, '');
      let matches = [...strippedInfo.matchAll(/\d+/g)];
      let line = parseInt(matches[0][0], 10);
      let column = parseInt(matches[1][0], 10);
      // The help omits the original file name, because TS will provide that.
      let help = lines.slice(2).join('\n');

      return {
        isContentTagError: true,
        raw,
        message,
        line,
        column,
        file: filename,
        help,
      };
    }
  }

  return `${e}`;
}

/**
 * Given a sparse `CorrelatedSpan` array and the original source for a module,
 * returns the resulting full transformed source string for that module, as
 * well as a filled-in array of correlated spans that includes chunks of the
 * original source that were not transformed.
 */
function calculateTransformedSource(
  originalFile: SourceFile,
  sparseSpans: Array<CorrelatedSpan>,
  directives: Array<Directive>,
): { contents: string; correlatedSpans: Array<CorrelatedSpan> } {
  let correlatedSpans: Array<CorrelatedSpan> = [];
  let originalOffset = 0;
  let transformedOffset = 0;

  for (let span of sparseSpans) {
    let interstitial = originalFile.contents.slice(originalOffset, span.insertionPoint);

    if (interstitial.length) {
      correlatedSpans.push({
        originalFile,
        originalStart: originalOffset,
        originalLength: interstitial.length,
        insertionPoint: originalOffset,
        transformedStart: transformedOffset,
        transformedLength: interstitial.length,
        transformedSource: interstitial,
      });
    }

    correlatedSpans.push(span);

    transformedOffset += interstitial.length + span.transformedLength;
    originalOffset +=
      interstitial.length + (span.originalFile === originalFile ? span.originalLength : 0);
  }

  let trailingContent = originalFile.contents.slice(originalOffset);

  const trailingSpan: CorrelatedSpan = {
    originalFile,
    originalStart: originalOffset,
    originalLength: trailingContent.length + 1,
    insertionPoint: originalOffset,
    transformedStart: transformedOffset,
    transformedLength: trailingContent.length + 1,
    transformedSource: trailingContent,
  };

  correlatedSpans.push(trailingSpan);

  const placeholderContent = '\n\n// @ts-expect-error placeholder for glint-expect-error\n;\n';

  for (let directive of directives) {
    if (directive.kind === 'expect-error') {
      correlatedSpans.push({
        originalFile,
        originalStart: directive.location.start,
        originalLength: directive.location.end - directive.location.start,
        insertionPoint: originalOffset + trailingContent.length,
        transformedSource: placeholderContent,
        transformedStart: transformedOffset + trailingContent.length,
        transformedLength: placeholderContent.length,
      });
    }
  }

  return {
    contents: correlatedSpans.map((span) => span.transformedSource).join(''),
    correlatedSpans,
  };
}

/**
 * Given an array of `PartialCorrelatedSpan`s for a file, calculates
 * their `transformedLength` and `transformedStart` values, resulting
 * in full `CorrelatedSpan`s.
 */
function completeCorrelatedSpans(
  partialSpans: Array<PartialCorrelatedSpan>,
): Array<CorrelatedSpan> {
  let correlatedSpans: Array<CorrelatedSpan> = [];

  for (let i = 0; i < partialSpans.length; i++) {
    let current = partialSpans[i];
    let transformedLength = current.transformedSource.length;
    let transformedStart = current.insertionPoint;
    if (i > 0) {
      let previous = correlatedSpans[i - 1];
      transformedStart =
        previous.transformedStart +
        previous.transformedSource.length +
        (current.insertionPoint - previous.insertionPoint - previous.originalLength);
    }

    correlatedSpans.push({ ...current, transformedStart, transformedLength });
  }

  return correlatedSpans;
}

/**
 * Insert a triple-slash reference directive to the top of the transformed file which provides
 * an anchor/insertion point for auto-imports. This fixes an issue where auto-imports
 * don't work for the first import in a file.
 *
 * Because we don't provide any mapping information to Volar, the internal error that
 * this generates is quietly swallowed when Volar reverse source-maps the error back to
 * .gts/.gjs. This is hacky but I don't know of any other (non-upstream) fix for this.
 *
 * Potential upstream Volar fix for this:
 * https://github.com/volarjs/volar.js/pull/281
 */
function generateAutoImportAnchor(script: SourceFile): PartialCorrelatedSpan {
  return {
    originalFile: script,
    originalStart: 0,
    originalLength: 0,
    insertionPoint: 0,
    transformedSource: '/// <reference types="__GLINT_AUTO_IMPORT_ANCHOR__" />\n',
  };
}
