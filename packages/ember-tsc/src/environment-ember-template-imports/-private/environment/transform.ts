import { GlintExtensionTransform } from '@glint/ember-tsc/config-types';
import type ts from 'typescript';
import { GLOBAL_TAG, PreprocessData, TemplateLocation } from './common.js';

type TSLib = typeof ts;

export const transform: GlintExtensionTransform<PreprocessData> = (
  data,
  { ts, context, setEmitMetadata },
) => {
  let f = ts.factory;
  let { templateLocations } = data;
  if (!templateLocations.length) return (sf) => sf;

  // TypeScript 6 changed `getStart()` to require the source file when the node's
  // parent chain is not yet intact. During transformation, `repairAncestry` runs
  // *after* `transformNode`, so parent pointers are not set up at the point where
  // `findTemplateLocation` calls `node.getStart()`. We capture the source file as
  // we enter it so we can pass it explicitly.
  let currentSourceFile: ts.SourceFile | undefined;

  return function visit(node: ts.Node): ts.Node {
    if (ts.isSourceFile(node)) currentSourceFile = node;
    let visitedNode = ts.visitEachChild(node, visit, context);
    let transformedNode = transformNode(visitedNode);
    return repairAncestry(transformedNode);
  };

  function transformNode(node: ts.Node): ts.Node {
    if (ts.isSourceFile(node)) {
      // Prepend a synthetic `import { hbs as ___T } from '...'` so the emitted
      // `___T`...`` literals have a tag binding. Downstream `resolveTagInfo`
      // recognizes them as the built-in `<template>` form precisely because
      // this import is compiler-synthesized (it has no source position); their
      // types come from the environment's `getTemplateConfig()`. This is not —
      // and must not be confused with — the unsupported
      // `ember-template-imports` `hbs`.
      return addTagImport(f, node);
    } else if (isETITemplateLiteral(ts, node)) {
      // Correlate every glint tag literal (`___T`...``) back to its original
      // `<template>` source span. This is the only consumer of the location
      // table; it is keyed on the literal's exact start offset, so it matches
      // each real template once and never a surrounding array or expression.
      let location = findTemplateLocation(templateLocations, node, currentSourceFile);
      setEmitMetadata(node, {
        templateLocation: {
          start: location.startTagOffset,
          end: location.endTagOffset + location.endTagLength,
          contentStart: location.startTagOffset + location.startTagLength,
          contentEnd: location.endTagOffset,
        },
      });
      return node;
    } else if (isETIDefaultTemplate(ts, node)) {
      // Annotate that this template is a default export
      setEmitMetadata(node.expression, { prepend: 'export default ' });
      return node;
    } else if (isETIDefaultSatisfiesTemplate(ts, node)) {
      // Annotate that this template is a default export
      setEmitMetadata(node.expression.expression, { prepend: 'export default ' });
      return node;
    } else if (isETITemplateProperty(ts, node)) {
      // Convert '[___T`foo`]' in a class body to 'static { ___T`foo` }'. The
      // tag literal already carries its `templateLocation` from the branch
      // above; here we only add the static-block framing.
      let template = node.name.expression;
      setEmitMetadata(template, { prepend: 'static { ', append: ' }' });
      return buildStaticBlockForTemplate(f, template);
    }

    return node;
  }
};

// Many location operations in the TS AST rely on having an unbroken chain
// of `.parent` values fron a given node up to its containing `SourceFile`,
// but its transformation framework does not maintain these by default,
// so we explicitly reconnect nodes as we go.
function repairAncestry(node: ts.Node, parent: ts.Node = node.parent): ts.Node {
  // If the node already has a parent AND it's correct, we don't need
  // to descend further.
  if (parent && node.parent === parent) return node;

  Object.assign(node, { parent });

  node.forEachChild((child) => {
    repairAncestry(child, node);
  });

  return node;
}

function addTagImport(f: ts.NodeFactory, sourceFile: ts.SourceFile): ts.SourceFile {
  return f.updateSourceFile(sourceFile, [
    f.createImportDeclaration(
      [],
      f.createImportClause(
        false,
        undefined,
        f.createNamedImports([
          f.createImportSpecifier(false, f.createIdentifier('hbs'), f.createIdentifier(GLOBAL_TAG)),
        ]),
      ),
      f.createStringLiteral('@glint/ember-tsc/environment-ember-template-imports/-private/tag'),
    ),
    ...sourceFile.statements,
  ]);
}

type ETITemplateLiteral = ts.TaggedTemplateExpression & {
  template: ts.NoSubstitutionTemplateLiteral;
};

type ETITemplateProperty = ts.PropertyDeclaration & {
  name: ts.ComputedPropertyName & { expression: ETITemplateLiteral };
};

type ETIDefaultTemplate = ts.ExpressionStatement & {
  expression: ETITemplateLiteral;
};

type ETIDefaultSatisfiesTemplate = ts.ExpressionStatement & {
  expression: ts.SatisfiesExpression & { expression: ETITemplateLiteral };
};

/**
 * Implicit default export:
 *
 *   ( <template></template> )
 *   ^ ExpressionStatement
 *
 *   ( <template></template> satisfies ... )
 *   ^ SatisfiesExpression
 *
 * But!
 *
 *   ( const X = <template></template> satisfies ... )
 *   ^ VariableStatement
 *
 * So when we check for a wrapping SatisfiesExpression, we need to also make sure
 * the parent node is not a variable Statement.
 */
function isETIDefaultTemplate(ts: TSLib, node: ts.Node): node is ETIDefaultTemplate {
  return ts.isExpressionStatement(node) && isETITemplateLiteral(ts, node.expression);
}

function isETIDefaultSatisfiesTemplate(
  ts: TSLib,
  node: ts.Node,
): node is ETIDefaultSatisfiesTemplate {
  return (
    ts.isExpressionStatement(node) &&
    ts.isSatisfiesExpression(node.expression) &&
    isETITemplateLiteral(ts, node.expression.expression)
  );
}

function isETITemplateProperty(ts: TSLib, node: ts.Node): node is ETITemplateProperty {
  return (
    ts.isPropertyDeclaration(node) &&
    ts.isComputedPropertyName(node.name) &&
    isETITemplateLiteral(ts, node.name.expression)
  );
}

function isETITemplateLiteral(ts: TSLib, node: ts.Node): node is ETITemplateLiteral {
  return (
    ts.isTaggedTemplateExpression(node) &&
    ts.isNoSubstitutionTemplateLiteral(node.template) &&
    ts.isIdentifier(node.tag) &&
    node.tag.text === GLOBAL_TAG
  );
}

function findTemplateLocation(
  locations: Array<TemplateLocation>,
  node: ETITemplateLiteral,
  sourceFile?: ts.SourceFile,
): TemplateLocation {
  // Every emitted tag literal corresponds to exactly one recorded location, so
  // a miss here is a genuine construction bug, not an expected "skip this node".
  let location = locations.find((loc) => loc.transformedStart === node.getStart(sourceFile));

  if (!location) {
    throw new Error('Internal error: missing location info for template');
  }

  return location;
}

function buildStaticBlockForTemplate(
  f: ts.NodeFactory,
  template: ts.TaggedTemplateExpression,
): ts.Node {
  return f.createClassStaticBlockDeclaration(
    f.createBlock([f.createExpressionStatement(template)]),
  );
}
