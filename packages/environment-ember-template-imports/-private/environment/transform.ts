import type * as ts from 'typescript';
import { GlintExtensionTransform } from '@glint/config/types';
import { PreprocessData, GLOBAL_TAG, TemplateLocation } from './common';

type TSLib = typeof ts;

export const transform: GlintExtensionTransform<PreprocessData> = (
  data,
  { ts, context, setEmitMetadata }
) => {
  let f = ts.factory;
  let { templateLocations } = data;
  if (!templateLocations.length) return (sf) => sf;

  return function visit(node: ts.Node): ts.Node {
    let visitedNode = ts.visitEachChild(node, visit, context);
    let transformedNode = transformNode(visitedNode);
    return repairAncestry(transformedNode);
  };

  function transformNode(node: ts.Node): ts.Node {
    if (ts.isSourceFile(node)) {
      // Add `import { hbs as __T } from 'ember-template-imports'` to the file
      return addTagImport(f, node);
    } else if (isETIDefaultTemplate(ts, node)) {
      // Annotate that this template is a default export
      setEmitMetadata(node.expression, { prepend: 'export default ' });

      return node;
    } else if (isETITemplateExpression(ts, node)) {
      // Convert '[__T`foo`]' as an expression to just '__T`foo`'
      let location = findTemplateLocation(templateLocations, node);

      let template = node.elements[0];
      setEmitMetadata(template, {
        templateLocation: {
          start: location.startTagOffset,
          end: location.endTagOffset + location.endTagLength,
          contentStart: location.startTagOffset + location.startTagLength,
          contentEnd: location.endTagOffset,
        },
      });
      return template;
    } else if (isETITemplateProperty(ts, node)) {
      // Convert '[__T`foo`]' in a class body to 'static { __T`foo` }'
      let location = findTemplateLocation(templateLocations, node);
      let template = node.name.expression;

      setEmitMetadata(template, {
        prepend: 'static { ',
        append: ' }',
        templateLocation: {
          start: location.startTagOffset,
          end: location.endTagOffset + location.endTagLength,
          contentStart: location.startTagOffset + location.startTagLength,
          contentEnd: location.endTagOffset,
        },
      });

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
      [],
      f.createImportClause(
        false,
        undefined,
        f.createNamedImports([
          f.createImportSpecifier(false, f.createIdentifier('hbs'), f.createIdentifier(GLOBAL_TAG)),
        ])
      ),
      f.createStringLiteral('ember-template-imports')
    ),
    ...sourceFile.statements,
  ]);
}

type ETITemplateLiteral = ts.TaggedTemplateExpression & {
  template: ts.NoSubstitutionTemplateLiteral;
};

type ETITemplateExpression = ts.ArrayLiteralExpression & {
  elements: [ETITemplateLiteral];
};

type ETITemplateProperty = ts.PropertyDeclaration & {
  name: ts.ComputedPropertyName & { expression: ETITemplateLiteral };
};

type ETIDefaultTemplate = ts.ExpressionStatement & {
  expression: ETITemplateLiteral;
};

function isETIDefaultTemplate(ts: TSLib, node: ts.Node): node is ETIDefaultTemplate {
  return ts.isExpressionStatement(node) && isETITemplateLiteral(ts, node.expression);
}

function isETITemplateProperty(ts: TSLib, node: ts.Node): node is ETITemplateProperty {
  return (
    ts.isPropertyDeclaration(node) &&
    ts.isComputedPropertyName(node.name) &&
    isETITemplateLiteral(ts, node.name.expression)
  );
}

function isETITemplateExpression(ts: TSLib, node: ts.Node): node is ETITemplateExpression {
  return (
    ts.isArrayLiteralExpression(node) &&
    node.elements.length === 1 &&
    isETITemplateLiteral(ts, node.elements[0])
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
  node: ETITemplateExpression | ETITemplateProperty
): TemplateLocation {
  let location = locations.find((loc) => loc.transformedStart === node.getStart());

  if (!location) {
    throw new Error('Internal error: missing location info for template');
  }

  return location;
}

function buildStaticBlockForTemplate(
  f: ts.NodeFactory,
  template: ts.TaggedTemplateExpression
): ts.Node {
  return f.createClassStaticBlockDeclaration(
    [],
    [],
    f.createBlock([f.createExpressionStatement(template)])
  );
}
