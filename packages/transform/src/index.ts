import logger from 'debug';
import { parseSync, NodePath, types as t, traverse } from '@babel/core';
import generate from '@babel/generator';
import type ts from 'typescript';
import { GlintEnvironment } from '@glint/config';
import { templateToTypescript } from './template-to-typescript';
import { assert } from './util';
import TransformedModule, {
  CorrelatedSpan,
  TransformError,
  SourceFile,
} from './transformed-module';

export { TransformedModule };

const debug = logger('@glint/compile:mapping');

type PartialCorrelatedSpan = Omit<CorrelatedSpan, 'transformedStart' | 'transformedLength'>;

/**
 * Given a TypeScript diagnostic object from a module that was rewritten
 * by `rewriteModule`, as well as the resulting `TransformedModule`, returns
 * a rewritten version of that diagnostic that maps to the corresponding
 * location in the original source file.
 */
export function rewriteDiagnostic(
  tsImpl: typeof ts,
  transformedDiagnostic: ts.DiagnosticWithLocation | ts.DiagnosticRelatedInformation,
  transformedModule: TransformedModule
): ts.DiagnosticWithLocation {
  assert(transformedDiagnostic.start);
  assert(transformedDiagnostic.length);

  let { start, end, source } = transformedModule.getOriginalRange(
    transformedDiagnostic.start,
    transformedDiagnostic.start + transformedDiagnostic.length
  );

  let length = end - start;
  let diagnostic: ts.DiagnosticWithLocation = {
    ...transformedDiagnostic,
    start,
    length,
    file: tsImpl.createSourceFile(source.filename, source.contents, tsImpl.ScriptTarget.Latest),
  };

  if ('relatedInformation' in transformedDiagnostic && transformedDiagnostic.relatedInformation) {
    diagnostic.relatedInformation = transformedDiagnostic.relatedInformation.map((relatedInfo) =>
      rewriteDiagnostic(tsImpl, relatedInfo, transformedModule)
    );
  }

  return diagnostic;
}

/**
 * Input to the process of rewriting a template, containing one or both of:
 *   script: the backing JS/TS module for a component, which may contain
 *           embedded templates depending on the environment
 *   template: a standalone template file
 */
export type RewriteInput =
  | { script: SourceFile }
  | { template: SourceFile }
  | { template: SourceFile; script: SourceFile };

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
  input: RewriteInput,
  environment: GlintEnvironment
): TransformedModule | null {
  // TODO: handle template-only components
  if (!('script' in input)) return null;

  let scriptAST: t.File | t.Program | null = null;
  try {
    scriptAST = parseSync(input.script.contents, {
      filename: input.script.filename,
      code: false,
      presets: [require.resolve('@babel/preset-typescript')],
      plugins: [[require.resolve('@babel/plugin-proposal-decorators'), { legacy: true }]],
    });
  } catch {
    // If parsing fails for any reason, we simply return null
  }

  if (!scriptAST) {
    return null;
  }

  // TODO: `calculateSpansForTaggedTemplates` should probably become just
  // `calculateCorrelatedSpans` and also handle inlining the companion template
  // if present.
  let { errors, partialSpans } = calculateSpansForTaggedTemplates(
    input.script,
    scriptAST,
    environment
  );

  if (!partialSpans.length && !errors.length) {
    return null;
  }

  let sparseSpans = completeCorrelatedSpans(partialSpans);
  let { contents, correlatedSpans } = calculateTransformedSource(input.script, sparseSpans);

  return new TransformedModule(contents, errors, correlatedSpans);
}

/**
 * Locates any embedded templates in the given AST and returns a corresponding
 * `PartialReplacedSpan` for each, as well as any errors encountered. These
 * spans are then used in `rewriteModule` above to calculate the full set of
 * source-to-source location information as well as the final transformed source
 * string.
 */
function calculateSpansForTaggedTemplates(
  source: SourceFile,
  ast: t.File | t.Program,
  environment: GlintEnvironment
): { errors: Array<TransformError>; partialSpans: Array<PartialCorrelatedSpan> } {
  let errors: Array<TransformError> = [];
  let partialSpans: Array<PartialCorrelatedSpan> = [];

  traverse(ast, {
    TaggedTemplateExpression(path) {
      let tag = path.get('tag');
      if (!tag.isIdentifier()) return;

      let typesPath = determineTypesPathForTag(tag, environment);
      if (typesPath) {
        let tagName = tag.node.name;
        let { quasis } = path.node.quasi;

        assert(quasis.length === 1, 'No interpolated values in template strings');
        assert(path.node.start, 'Missing location info');
        assert(path.node.end, 'Missing location info');

        // Pad the template to account for the tag and surrounding ` characters
        let template = `${''.padStart(tagName.length)} ${quasis[0].value.raw} `;

        // Emit a use of the template tag so it's not considered unused
        let preamble = [`${tagName};`];

        let { typeParams, contextType } = getContainingTypeInfo(path);
        let identifiersInScope = Object.keys(path.scope.getAllBindings());
        let transformedTemplate = templateToTypescript(template, {
          typesPath,
          preamble,
          identifiersInScope,
          typeParams,
          contextType,
        });

        if (!contextType) {
          errors.push({
            source,
            message: 'Classes containing templates must have a name',
            location: {
              start: path.node.start,
              end: path.node.end,
            },
          });
        }

        for (let { message, location } of transformedTemplate.errors) {
          if (location) {
            errors.push({
              source,
              message,
              location: {
                start: path.node.start + location.start,
                end: path.node.start + location.end,
              },
            });
          } else {
            assert(path.node.tag.start, 'Missing location info');
            assert(path.node.tag.end, 'Missing location info');

            errors.push({
              source,
              message,
              location: {
                start: path.node.tag.start,
                end: path.node.tag.end,
              },
            });
          }
        }

        if (transformedTemplate.result) {
          let { code, mapping } = transformedTemplate.result;
          if (debug.enabled) {
            debug(mapping.toDebugString(template, code));
          }

          partialSpans.push({
            originalFile: source,
            originalStart: path.node.start,
            originalLength: path.node.end - path.node.start,
            transformedSource: code,
            mapping: mapping,
          });
        }
      }
    },
  });

  return { errors, partialSpans };
}

function determineTypesPathForTag(
  path: NodePath<t.Identifier>,
  environment: GlintEnvironment
): string | undefined {
  for (let [importSource, tags] of Object.entries(environment.getConfiguredTemplateTags())) {
    for (let [importSpecifier, tagConfig] of Object.entries(tags)) {
      if (path.referencesImport(importSource, importSpecifier)) {
        return tagConfig.typesSource;
      }
    }
  }
}

/**
 * Given a sparse `CorrelatedSpan` array and the original source for a module,
 * returns the resulting full transformed source string for that module, as
 * well as a filled-in array of correlated spans that includes chunks of the
 * original source that were not transformed.
 */
function calculateTransformedSource(
  originalFile: SourceFile,
  sparseSpans: Array<CorrelatedSpan>
): { contents: string; correlatedSpans: Array<CorrelatedSpan> } {
  let correlatedSpans: Array<CorrelatedSpan> = [];
  let originalOffset = 0;
  let transformedOffset = 0;

  for (let span of sparseSpans) {
    let interstitial = originalFile.contents.slice(originalOffset, span.originalStart);

    correlatedSpans.push({
      originalFile,
      originalStart: originalOffset,
      originalLength: interstitial.length,
      transformedStart: transformedOffset,
      transformedLength: interstitial.length,
      transformedSource: interstitial,
    });

    correlatedSpans.push(span);

    transformedOffset += interstitial.length + span.transformedLength;
    originalOffset +=
      interstitial.length + (span.originalFile === originalFile ? span.originalLength : 0);
  }

  let trailingContent = originalFile.contents.slice(originalOffset);

  correlatedSpans.push({
    originalFile,
    originalStart: originalOffset,
    originalLength: trailingContent.length + 1,
    transformedStart: transformedOffset,
    transformedLength: trailingContent.length + 1,
    transformedSource: trailingContent,
  });

  return {
    contents: correlatedSpans.map((span) => span.transformedSource).join(''),
    correlatedSpans,
  };
}

/**
 * Given an array of `PartialCorrelatedSpan`s for a file, calculates
 * their `transformedLength` and `transformedStart` values, resulting
 * in full `ReplacedSpan`s.
 */
function completeCorrelatedSpans(
  partialSpans: Array<PartialCorrelatedSpan>
): Array<CorrelatedSpan> {
  let replacedSpans: Array<CorrelatedSpan> = [];

  for (let i = 0; i < partialSpans.length; i++) {
    let current = partialSpans[i];
    let transformedLength = current.transformedSource.length;
    let transformedStart = current.originalStart;
    if (i > 0) {
      let previous = replacedSpans[i - 1];
      transformedStart =
        previous.transformedStart +
        previous.transformedSource.length +
        (current.originalStart - previous.originalStart - previous.originalLength);
    }

    replacedSpans.push({ ...current, transformedStart, transformedLength });
  }

  return replacedSpans;
}

/**
 * Given an AST node for an embedded template, determines the appropriate
 * instance type to be passed to `@glint/template`'s `ResolveContext`, as well
 * as any type parameters that need to be propagated as inputs to the template's
 * root generator function.
 *
 * For example, a template declared within `class MyComponent<T extends string>`
 * would give `MyComponent<T>` as the context type, and `<T extends string>` as
 * the type params, ultimately resulting in a template function like:
 *
 *     template(function*<T extends string>(𝚪: ResolveContext<MyComponent<T>>){
 *       // ...
 *     })
 */
function getContainingTypeInfo(path: NodePath<any>): { contextType?: string; typeParams?: string } {
  let container = findContainingClass(path);
  let contextType = container?.id?.name ?? undefined;
  let typeParams = undefined;

  let typeParamsNode = container?.typeParameters;
  if (t.isTSTypeParameterDeclaration(typeParamsNode)) {
    typeParams = generate(typeParamsNode).code;
    contextType += `<${typeParamsNode.params.map((param) => param.name).join(', ')}>`;
  }

  return { contextType, typeParams };
}

function findContainingClass(path: NodePath<any>): t.Class | null {
  let current: NodePath<any> = path;
  while ((current = current.parentPath)) {
    if (t.isClass(current.node)) {
      return current.node;
    }
  }
  return null;
}
