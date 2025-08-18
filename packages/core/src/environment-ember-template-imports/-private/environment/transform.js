"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transform = void 0;
const common_1 = require("./common");
const transform = (data, { ts, context, setEmitMetadata }) => {
    let f = ts.factory;
    let { templateLocations } = data;
    if (!templateLocations.length)
        return (sf) => sf;
    return function visit(node) {
        let visitedNode = ts.visitEachChild(node, visit, context);
        let transformedNode = transformNode(visitedNode);
        return repairAncestry(transformedNode);
    };
    function transformNode(node) {
        if (ts.isSourceFile(node)) {
            // Add `import { hbs as __T } from 'ember-template-imports'` to the file
            return addTagImport(f, node);
        }
        else if (isETIDefaultTemplate(ts, node)) {
            // Annotate that this template is a default export
            setEmitMetadata(node.expression, { prepend: 'export default ' });
            return node;
        }
        else if (isETIDefaultSatisfiesTemplate(ts, node)) {
            // Annotate that this template is a default export
            setEmitMetadata(node.expression.expression, { prepend: 'export default ' });
            return node;
        }
        else if (isETITemplateExpression(ts, node)) {
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
        }
        else if (isETITemplateProperty(ts, node)) {
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
exports.transform = transform;
// Many location operations in the TS AST rely on having an unbroken chain
// of `.parent` values fron a given node up to its containing `SourceFile`,
// but its transformation framework does not maintain these by default,
// so we explicitly reconnect nodes as we go.
function repairAncestry(node, parent = node.parent) {
    // If the node already has a parent AND it's correct, we don't need
    // to descend further.
    if (parent && node.parent === parent)
        return node;
    Object.assign(node, { parent });
    node.forEachChild((child) => {
        repairAncestry(child, node);
    });
    return node;
}
function addTagImport(f, sourceFile) {
    return f.updateSourceFile(sourceFile, [
        f.createImportDeclaration([], f.createImportClause(false, undefined, f.createNamedImports([
            f.createImportSpecifier(false, f.createIdentifier('hbs'), f.createIdentifier(common_1.GLOBAL_TAG)),
        ])), f.createStringLiteral('@glint/environment-ember-template-imports/-private/tag')),
        ...sourceFile.statements,
    ]);
}
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
function isETIDefaultTemplate(ts, node) {
    return ts.isExpressionStatement(node) && isETITemplateLiteral(ts, node.expression);
}
function isETIDefaultSatisfiesTemplate(ts, node) {
    return (ts.isExpressionStatement(node) &&
        ts.isSatisfiesExpression(node.expression) &&
        isETITemplateLiteral(ts, node.expression.expression));
}
function isETITemplateProperty(ts, node) {
    return (ts.isPropertyDeclaration(node) &&
        ts.isComputedPropertyName(node.name) &&
        isETITemplateLiteral(ts, node.name.expression));
}
function isETITemplateExpression(ts, node) {
    return (ts.isArrayLiteralExpression(node) &&
        node.elements.length === 1 &&
        isETITemplateLiteral(ts, node.elements[0]));
}
function isETITemplateLiteral(ts, node) {
    return (ts.isTaggedTemplateExpression(node) &&
        ts.isNoSubstitutionTemplateLiteral(node.template) &&
        ts.isIdentifier(node.tag) &&
        node.tag.text === common_1.GLOBAL_TAG);
}
function findTemplateLocation(locations, node) {
    let location = locations.find((loc) => loc.transformedStart === node.getStart());
    if (!location) {
        throw new Error('Internal error: missing location info for template');
    }
    return location;
}
function buildStaticBlockForTemplate(f, template) {
    return f.createClassStaticBlockDeclaration(f.createBlock([f.createExpressionStatement(template)]));
}
//# sourceMappingURL=transform.js.map