import type ts from 'typescript';
import GlimmerASTMappingTree, { MappingSource } from '../template/glimmer-ast-mapping-tree.js';
import TransformedModule from '../template/transformed-module.js';
import { Diagnostic } from './index.js';

export function augmentDiagnostics<T extends Diagnostic>(
  transformedModule: TransformedModule,
  diagnostics: T[],
): T[] {
  const mappingForDiagnostic = (diagnostic: ts.Diagnostic): GlimmerASTMappingTree[] => {
    if (!transformedModule) {
      return [];
    }

    if (!diagnostic.start || !diagnostic.length) {
      return [];
    }

    const start = diagnostic.start;
    const end = start + diagnostic.length;

    return transformedModule.getExactTransformedRanges(
      transformedModule.originalFileName,
      start,
      end,
    );
  };

  const augmentedDiagnostics: Diagnostic[] = [];

  for (const diagnostic of diagnostics) {
    const augmentedDiagnostic = rewriteMessageText(diagnostic, mappingForDiagnostic);

    augmentedDiagnostics.push(augmentedDiagnostic);
  }

  // @ts-expect-error not sure how to fix
  return augmentedDiagnostics;
}

type DiagnosticHandler<T extends Diagnostic> = (
  diagnostic: T,
  mapping: GlimmerASTMappingTree,
) => T | undefined;

function rewriteMessageText(
  diagnostic: Diagnostic,
  mappingGetter: (diagnostic: Diagnostic) => GlimmerASTMappingTree[],
): Diagnostic {
  const handler = diagnosticHandlers[diagnostic.code?.toString() ?? ''];
  if (!handler) {
    return diagnostic;
  }

  for (let mapping of mappingGetter(diagnostic)) {
    const augmentedDiagnostic = handler(diagnostic, mapping);
    if (augmentedDiagnostic) {
      return augmentedDiagnostic;
    }
  }

  return diagnostic;
}

const diagnosticHandlers: Record<string, DiagnosticHandler<Diagnostic> | undefined> = {
  '2307': checkGlintLibImports, // TS2307: An import cannot be found.
  '2322': checkAssignabilityError, // TS2322: Type 'X' is not assignable to type 'Y'.
  '2345': checkAssignabilityError, // TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'.
  '2554': noteNamedArgsAffectArity, // TS2554: Expected N arguments, but got M.
  '2555': noteNamedArgsAffectArity, // TS2555: Expected at least N arguments, but got M.
  '2769': checkResolveError, // TS2769: No overload matches this call.
  '4111': checkIndexAccessError, // TS4111: Property 'x' comes from an index signature, so it must be accessed with ['x'].
  '7053': checkImplicitAnyError, // TS7053: Element implicitly has an 'any' type because expression of type '"X"' can't be used to index type 'Y'.
};

const bindHelpers = ['component', 'helper', 'modifier'];

function checkGlintLibImports(
  diagnostic: Diagnostic,
  _mapping: GlimmerASTMappingTree,
): Diagnostic | undefined {
  let messageText =
    typeof diagnostic.messageText === 'string'
      ? diagnostic.messageText
      : diagnostic.messageText.messageText;

  const typesModules = '@glint/ember-tsc/-private/dsl';

  if (messageText.includes(typesModules)) {
    return addGlintDetails(
      diagnostic,
      'You appear to be using version 2 of the Glint VS Code extension ' +
        '(or a v2 Glint plugin for another IDE), but your package.json still ' +
        'references version 1 Glint dependencies (or they are missing). You need to either upgrade your `@glint/core` ' +
        'and `@glint/template` project dependencies, or downgrade your VS Code Glint extension to version 1.x. ' +
        'Please see the Glint v2 release notes and upgrade guide for more information.',
    );
  } else {
    return diagnostic;
  }
}

function checkAssignabilityError(
  diagnostic: Diagnostic,
  mapping: GlimmerASTMappingTree,
): Diagnostic | undefined {
  let node = mapping.sourceNode;
  let parentNode = mapping.parent?.sourceNode;
  if (!parentNode) return;

  if (parentNode.type === node.type) {
    // For Volar, we added a few more artificial nestings / wrappings around Handlebars
    // AST nodes to provide more hookpoints for TS diagnostics to correctly source-map
    // back to .gts/.hbs source code. The result of this is that sometimes you have
    // things like MustacheNodes being "parents" of MustacheNodes, which we try and
    // detect here.
    //
    // This can go away if/when we refactor the `transformModule` code.
    parentNode = mapping.parent?.parent?.sourceNode;

    if (!parentNode) return;
  }

  if (
    node.type === 'Identifier' &&
    parentNode.type === 'AttrNode' &&
    !/^(@|\.)/.test(parentNode.name)
  ) {
    // If the assignability issue is on an attribute name and it's not an `@arg`
    // or `...attributes`, then it's an HTML attribute type issue.
    return addGlintDetails(
      diagnostic,
      'Only primitive values (see `AttrValue` in `@glint/template`) are assignable as HTML attributes. ' +
        'If you want to set an event listener, consider using the `{{on}}` modifier instead.',
    );
  } else if (
    node.type === 'AttrNode' &&
    parentNode.type === 'ElementNode' &&
    !/^(@|\.)/.test(node.name)
  ) {
    // If the assignability issue is on an attribute name and it's not an `@arg`
    // or `...attributes`, then it's an HTML attribute type issue.
    return addGlintDetails(
      diagnostic,
      'An Element must be specified in the component signature in order to pass in HTML attributes.',
    );
  } else if (
    node.type === 'MustacheStatement' &&
    (parentNode.type === 'Template' ||
      parentNode.type === 'BlockStatement' ||
      parentNode.type === 'ElementNode') &&
    !(node.path.type === 'PathExpression' && node.path.original === 'yield')
  ) {
    // If we're looking at a top-level {{mustache}}, we first double check whether
    // it's an attempted inline {{component 'foo'}} invocation...
    if (node.path.type === 'PathExpression' && node.path.original === 'component') {
      return addGlintDetails(
        diagnostic,
        `The {{component}} helper can't be used to directly invoke a component under Glint. ` +
          `Consider first binding the result to a variable, e.g. ` +
          `'{{#let (component 'component-name') as |ComponentName|}}' and then invoking it as ` +
          `'<ComponentName @arg={{value}} />'.`,
      );
    }

    // Otherwise, it's a DOM content type issue.
    return addGlintDetails(
      diagnostic,
      'Only primitive values and certain DOM objects (see `ContentValue` in `@glint/template`) are ' +
        'usable as top-level template content.',
    );
  } else if (
    (mapping?.sourceNode.type === 'SubExpression' ||
      mapping?.sourceNode.type === 'MustacheStatement') &&
    mapping.sourceNode.path.type === 'PathExpression' &&
    bindHelpers.includes(mapping.sourceNode.path.original)
  ) {
    // If we're looking at a binding helper subexpression like `(component ...)`, error messages
    // may be very straightforward or may be horrendously complex when users start playing games
    // with parametrized types, so we add a hint here.
    let kind = mapping.sourceNode.path.original;
    return {
      ...diagnostic,
      messageText: `Unable to pre-bind the given args to the given ${kind}. This likely indicates a type mismatch between its signature and the values you're passing.`,
    };
  }
}

function noteNamedArgsAffectArity(
  diagnostic: Diagnostic,
  mapping: GlimmerASTMappingTree,
): Diagnostic | undefined {
  // In normal template entity invocations, named args (if specified) are effectively
  // passed as the final positional argument. Because of this, the reported "expected
  // N arguments, but got M" message may appear to be off-by-one to the developer.

  // Since this treatment of named args as a final "options hash" argument is user
  // visible in cases like type errors, we can't just paper over this by subtracting
  // 1 from the numbers in the message. Instead, if the invocation has named args, we
  // explicitly note that they're effectively the final positional parameter.

  let callNode = findAncestor(mapping, 'MustacheStatement', 'SubExpression');
  if (callNode?.path.type === 'PathExpression' && callNode.path.original === 'yield') {
    // Yield is directly transformed rather than being treated as a normal mustache
    return;
  }

  let hasNamedArgs = !!callNode?.hash.pairs.length;
  if (hasNamedArgs) {
    let note =
      'Note that named args are passed together as a final argument, so they ' +
      'collectively increase the given arg count by 1.';

    return {
      ...diagnostic,
      messageText: `${diagnostic.messageText} ${note}`,
    };
  }
}

function checkResolveError(
  diagnostic: Diagnostic,
  mapping: GlimmerASTMappingTree,
): Diagnostic | undefined {
  // The diagnostic might fall on a lone identifier or a full path; if the former,
  // we need to traverse up through the path to find the true parent.
  let sourceMapping = mapping.sourceNode.type === 'Identifier' ? mapping.parent : mapping;
  let parentNode = sourceMapping?.parent?.sourceNode;

  // If this error is on the first param to a {{component}} or other bind invocation, this means
  // we either have a non-component value or a string that's missing from the registry.
  if (
    (parentNode?.type === 'SubExpression' || parentNode?.type === 'MustacheStatement') &&
    parentNode.path.type === 'PathExpression' &&
    bindHelpers.includes(parentNode.path.original) &&
    parentNode.params[0] === sourceMapping?.sourceNode
  ) {
    let kind = parentNode.path.original;

    if (sourceMapping.sourceNode.type === 'StringLiteral') {
      return addGlintDetails(
        diagnostic,
        `Unknown ${kind} name '${sourceMapping.sourceNode.value}'. If this isn't a typo, you may be ` +
          `missing a registry entry for this name; see the Template Registry page in the Glint ` +
          `documentation for more details.`,
      );
    } else {
      return addGlintDetails(
        diagnostic,
        `The type of this expression doesn't appear to be a valid value to pass the {{${kind}}} ` +
          `helper. If possible, you may need to give the expression a narrower type, ` +
          `for example \`'thing-a' | 'thing-b'\` rather than \`string\`.`,
      );
    }
  }

  // Otherwise if this is on a top level invocation, we're trying to use a template-unaware
  // value in a template-specific way.
  let nodeType = sourceMapping?.sourceNode.type;
  if (nodeType === 'ElementNode' || nodeType === 'PathExpression' || nodeType === 'Identifier') {
    return addGlintDetails(
      diagnostic,
      'The given value does not appear to be usable as a component, modifier or helper.',
    );
  }
}

function checkImplicitAnyError(
  diagnostic: Diagnostic,
  mapping: GlimmerASTMappingTree,
): Diagnostic | undefined {
  let message = diagnostic.messageText;

  // We don't want to bake in assumptions about the exact format of TS error messages,
  // but we can assume that the name of the type we're indexing (`Globals`) will appear
  // in the text in the case we're interested in.
  if (typeof message === 'string' && message.includes('Globals')) {
    let { sourceNode } = mapping;

    // This error may appear either on `<Foo />` or `{{foo}}`/`(foo)`
    let globalName =
      sourceNode.type === 'ElementNode'
        ? sourceNode.path.head.original
        : sourceNode.type === 'PathExpression' && sourceNode.head.type === 'VarHead'
          ? sourceNode.head.name
          : null;

    if (globalName) {
      return addGlintDetails(
        diagnostic,
        `Unknown name '${globalName}'. If this isn't a typo, you may be missing a registry entry ` +
          `for this value; see the Template Registry page in the Glint documentation for more details.`,
      );
    }
  }
}

function checkIndexAccessError(
  diagnostic: Diagnostic,
  mapping: GlimmerASTMappingTree,
): Diagnostic | undefined {
  if (mapping.sourceNode.type === 'Identifier' && typeof diagnostic.messageText === 'string') {
    let message = diagnostic.messageText;

    // "accessed with ['x']" => "accessed with {{get ... 'x'}}"
    return {
      ...diagnostic,
      messageText: message.replace(/\[(['"])(.*)\1\]/, `{{get ... $1$2$1}}`),
    };
  }
}

function addGlintDetails(diagnostic: Diagnostic, details: string): Diagnostic {
  return {
    ...diagnostic,
    messageText: `${details}\n${diagnostic.messageText}`,
  };
}

// Find the nearest mapping node at or above the given one whose `source` AST node
// matches one of the given types.
function findAncestor<K extends MappingSource['type']>(
  mapping: GlimmerASTMappingTree,
  ...types: Array<K>
): Extract<MappingSource, { type: K }> | null {
  let current: GlimmerASTMappingTree | null = mapping;
  do {
    if (types.includes(current.sourceNode.type as K)) {
      return current.sourceNode as Extract<MappingSource, { type: K }>;
    }
  } while ((current = current.parent));
  return null;
}
