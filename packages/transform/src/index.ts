import logger from 'debug';
import { parseSync, NodePath, types as t, traverse } from '@babel/core';
import generate from '@babel/generator';
import type ts from 'typescript';
import { templateToTypescript } from './template-to-typescript';
import { assert } from './util';
import TransformedModule, { ReplacedSpan, TransformError } from './transformed-module';

export { TransformedModule };

const debug = logger('@glint/compile:mapping');

type PartialReplacedSpan = Omit<ReplacedSpan, 'transformedStart' | 'transformedLength'>;

/**
 * Given a TypeScript diagnostic object from a module that was rewritten
 * by `rewriteModule`, as well as the resulting `TransformedModule` and
 * the original un-transformed `SourceFile`, returns a rewritten version
 * of that diagnostic that maps to the corresponding location in the
 * original source file.
 */
export function rewriteDiagnostic(
  transformedDiagnostic: ts.DiagnosticWithLocation | ts.DiagnosticRelatedInformation,
  transformedModule: TransformedModule,
  originalSourceFile: ts.SourceFile
): ts.DiagnosticWithLocation {
  assert(transformedDiagnostic.start);
  assert(transformedDiagnostic.length);

  let { start, end } = transformedModule.getOriginalRange(
    transformedDiagnostic.start,
    transformedDiagnostic.start + transformedDiagnostic.length
  );

  let length = end - start;
  let diagnostic: ts.DiagnosticWithLocation = {
    ...transformedDiagnostic,
    start,
    length,
    file: originalSourceFile,
  };

  if ('relatedInformation' in transformedDiagnostic && transformedDiagnostic.relatedInformation) {
    diagnostic.relatedInformation = transformedDiagnostic.relatedInformation.map((relatedInfo) =>
      rewriteDiagnostic(relatedInfo, transformedModule, originalSourceFile)
    );
  }

  return diagnostic;
}

/**
 * Given the name of a module and its text, returns a `TransformedModule`
 * representing that module with any inline templates rewritten into
 * equivalent TypeScript using `@glint/template`.
 *
 * Returns `null` if the given module can't be parsed as TypeScript, or
 * if it has no embedded templates.
 */
export function rewriteModule(filename: string, source: string): TransformedModule | null {
  let ast = parseSync(source, {
    filename,
    code: false,
    presets: [require.resolve('@babel/preset-typescript')],
    plugins: [[require.resolve('@babel/plugin-proposal-decorators'), { legacy: true }]],
  });

  if (!ast) {
    return null;
  }

  let { errors, partialSpans } = calculateSpansForTaggedTemplates(ast);
  if (!partialSpans.length && !errors.length) {
    return null;
  }

  let fullSpans = calculateFullReplacedSpans(partialSpans);
  let transformedSource = calculateTransformedSource(source, fullSpans);

  return new TransformedModule(filename, source, transformedSource, errors, fullSpans);
}

/**
 * Locates any embedded templates in the given AST and returns a corresponding
 * `PartialReplacedSpan` for each, as well as any errors encountered. These
 * spans are then used in `rewriteModule` above to calculate the full set of
 * source-to-source location information as well as the final transformed source
 * string.
 */
function calculateSpansForTaggedTemplates(
  ast: t.File | t.Program
): { errors: Array<TransformError>; partialSpans: Array<PartialReplacedSpan> } {
  let errors: Array<TransformError> = [];
  let partialSpans: Array<PartialReplacedSpan> = [];

  traverse(ast, {
    TaggedTemplateExpression(path) {
      let tag = path.get('tag');
      if (isImportedIdentifier(tag, 'hbs', '@glimmerx/component')) {
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
          preamble,
          identifiersInScope,
          typeParams,
          contextType,
        });

        if (!contextType) {
          errors.push({
            message: 'Classes containing templates must have a name',
            location: {
              start: path.node.start,
              end: path.node.end,
            },
          });
        }

        for (let { message, location } of transformedTemplate.errors) {
          errors.push({
            message,
            location: {
              start: path.node.start + location.start,
              end: path.node.start + location.end,
            },
          });
        }

        if (transformedTemplate.result) {
          let { code, mapping } = transformedTemplate.result;
          if (debug.enabled) {
            debug(mapping.toDebugString(template, code));
          }

          partialSpans.push({
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

/**
 * Given a `ReplacedSpan` array and the original source for a module,
 * returns the resulting full transformed source string for that module.
 */
function calculateTransformedSource(originalSource: string, spans: ReplacedSpan[]): string {
  let segments = [];
  let totalOffset = 0;

  for (let replacedSpan of spans) {
    segments.push(originalSource.slice(totalOffset, replacedSpan.originalStart));
    segments.push(replacedSpan.transformedSource);
    totalOffset = replacedSpan.originalStart + replacedSpan.originalLength;
  }

  segments.push(originalSource.slice(totalOffset));

  return segments.join('');
}

/**
 * Given an array of `PartialReplacedSpan`s for a file, calculates
 * their `transformedLength` and `transformedStart` values, resulting
 * in full `ReplacedSpan`s.
 */
function calculateFullReplacedSpans(partialSpans: Array<PartialReplacedSpan>): Array<ReplacedSpan> {
  let replacedSpans: Array<ReplacedSpan> = [];

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

function isImportedIdentifier(
  path: NodePath<t.Expression> | NodePath<t.Identifier>,
  name: string,
  source: string
): path is NodePath<t.Identifier> {
  if (!t.isIdentifier(path.node)) return false;

  let binding = path.scope.getBinding(path.node.name);
  if (binding?.kind !== 'module') return false;

  let specifierNode = binding.path.node;
  if (
    (t.isImportDefaultSpecifier(specifierNode) && name !== 'default') ||
    !t.isImportSpecifier(specifierNode) ||
    specifierNode.imported.name !== name
  ) {
    return false;
  }

  let declarationNode = binding.path.parent;
  if (!t.isImportDeclaration(declarationNode)) return false;

  return declarationNode.source.value === source;
}
