import type * as ts from 'typescript';
import { Diagnostic } from './index.js';
import MappingTree, { MappingSource } from '../template/mapping-tree.js';

/**
 * Given a diagnostic and a mapping tree node corresponding to its location,
 * returns updated message text for that diagnostic with Glint-specific
 * information included, if applicable.
 */
export function augmentDiagnostic<T extends Diagnostic>(diagnostic: T, mapping: MappingTree): T {
  return {
    ...diagnostic,
    messageText: rewriteMessageText(diagnostic, mapping),
  };
}

type DiagnosticHandler = (
  diagnostic: Diagnostic,
  mapping: MappingTree
) => string | ts.DiagnosticMessageChain | undefined;

function rewriteMessageText(
  diagnostic: Diagnostic,
  mapping: MappingTree
): string | ts.DiagnosticMessageChain {
  return diagnosticHandlers[diagnostic.code]?.(diagnostic, mapping) ?? diagnostic.messageText;
}

const diagnosticHandlers: Record<number, DiagnosticHandler | undefined> = {
  2322: checkAssignabilityError, // TS2322: Type 'X' is not assignable to type 'Y'.
  2345: checkAssignabilityError, // TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'.
  2554: noteNamedArgsAffectArity, // TS2554: Expected N arguments, but got M.
  2555: noteNamedArgsAffectArity, // TS2555: Expected at least N arguments, but got M.
  2769: checkResolveError, // TS2769: No overload matches this call.
  4111: checkIndexAccessError, // TS4111: Property 'x' comes from an index signature, so it must be accessed with ['x'].
  7053: checkImplicitAnyError, // TS7053: Element implicitly has an 'any' type because expression of type '"X"' can't be used to index type 'Y'.
};

function checkAssignabilityError(
  message: Diagnostic,
  mapping: MappingTree
): ts.DiagnosticMessageChain | undefined {
  let node = mapping.sourceNode;
  let parentNode = mapping.parent?.sourceNode;
  if (!parentNode) return;

  if (
    node.type === 'Identifier' &&
    parentNode.type === 'AttrNode' &&
    !/^(@|\.)/.test(parentNode.name)
  ) {
    // If the assignability issue is on an attribute name and it's not an `@arg`
    // or `...attributes`, then it's an HTML attribute type issue.
    return addGlintDetails(
      message,
      'Only primitive values (see `AttrValue` in `@glint/template`) are assignable as HTML attributes. ' +
        'If you want to set an event listener, consider using the `{{on}}` modifier instead.'
    );
  } else if (
    node.type === 'BlockStatement' &&
    node.path.type === 'PathExpression' &&
    node.path.original === 'component'
  ) {
    // If it's attempted direct usage of `{{#component}}` as a curly block component,
    // give a special note that that's not supported.
    return addGlintDetails(
      message,
      `The {{component}} helper can't be used to directly invoke a component under Glint. ` +
        `Consider first binding the result to a variable, e.g. ` +
        `'{{#let (component 'component-name') as |ComponentName|}}' and then invoking it as ` +
        `'<ComponentName @arg={{value}}>...</ComponentName>'.`
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
        message,
        `The {{component}} helper can't be used to directly invoke a component under Glint. ` +
          `Consider first binding the result to a variable, e.g. ` +
          `'{{#let (component 'component-name') as |ComponentName|}}' and then invoking it as ` +
          `'<ComponentName @arg={{value}} />'.`
      );
    }

    // Otherwise, it's a DOM content type issue.
    return addGlintDetails(
      message,
      'Only primitive values and certain DOM objects (see `ContentValue` in `@glint/template`) are ' +
        'usable as top-level template content.'
    );
  }
}

function noteNamedArgsAffectArity(
  diagnostic: Diagnostic,
  mapping: MappingTree
): string | ts.DiagnosticMessageChain | undefined {
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

    if (typeof diagnostic.messageText === 'string') {
      return `${diagnostic.messageText} ${note}`;
    } else {
      return {
        ...diagnostic.messageText,
        messageText: `${diagnostic.messageText.messageText} ${note}`,
      };
    }
  }
}

function checkResolveError(
  diagnostic: Diagnostic,
  mapping: MappingTree
): ts.DiagnosticMessageChain | undefined {
  // The diagnostic might fall on a lone identifier or a full path; if the former,
  // we need to traverse up through the path to find the true parent.
  let sourceMapping = mapping.sourceNode.type === 'Identifier' ? mapping.parent : mapping;
  let parentNode = sourceMapping?.parent?.sourceNode;

  // If this error is on the first param to a {{component}} invocation, this means
  // we either have a non-component value or a string that's missing from the registry.
  if (
    (parentNode?.type === 'SubExpression' || parentNode?.type === 'MustacheStatement') &&
    parentNode.path.type === 'PathExpression' &&
    parentNode.path.original === 'component' &&
    parentNode.params[0] === sourceMapping?.sourceNode
  ) {
    if (sourceMapping.sourceNode.type === 'StringLiteral') {
      return addGlintDetails(
        diagnostic,
        `Unknown component name '${sourceMapping.sourceNode.value}'. If this isn't a typo, you may be ` +
          `missing a registry entry for this name; see the Template Registry page in the Glint ` +
          `documentation for more details.`
      );
    } else {
      return addGlintDetails(
        diagnostic,
        `The type of this expression doesn't appear to be a valid value to pass the {{component}} ` +
          `helper. If possible, you may need to give the expression a narrower type, ` +
          `for example \`'component-a' | 'component-b'\` rather than \`string\`.`
      );
    }
  }

  // Otherwise if this is on a top level invocation, we're trying to use a template-unaware
  // value in a template-specific way.
  let nodeType = sourceMapping?.sourceNode.type;
  if (nodeType === 'ElementNode' || nodeType === 'PathExpression' || nodeType === 'Identifier') {
    return addGlintDetails(
      diagnostic,
      'The given value does not appear to be usable as a component, modifier or helper.'
    );
  }
}

function checkImplicitAnyError(
  diagnostic: Diagnostic,
  mapping: MappingTree
): ts.DiagnosticMessageChain | undefined {
  let messageText =
    typeof diagnostic.messageText === 'string'
      ? diagnostic.messageText
      : diagnostic.messageText.messageText;

  // We don't want to bake in assumptions about the exact format of TS error messages,
  // but we can assume that the name of the type we're indexing (`Globals`) will appear
  // in the text in the case we're interested in.
  if (messageText.includes('Globals')) {
    let { sourceNode } = mapping;

    // This error may appear either on `<Foo />` or `{{foo}}`/`(foo)`
    let globalName =
      sourceNode.type === 'ElementNode'
        ? sourceNode.tag.split('.')[0]
        : sourceNode.type === 'PathExpression' && sourceNode.head.type === 'VarHead'
        ? sourceNode.head.name
        : null;

    if (globalName) {
      return addGlintDetails(
        diagnostic,
        `Unknown name '${globalName}'. If this isn't a typo, you may be missing a registry entry ` +
          `for this value; see the Template Registry page in the Glint documentation for more details.`
      );
    }
  }
}

function checkIndexAccessError(diagnostic: Diagnostic, mapping: MappingTree): string | undefined {
  if (mapping.sourceNode.type === 'Identifier') {
    let messageText =
      typeof diagnostic.messageText === 'string'
        ? diagnostic.messageText
        : diagnostic.messageText.messageText;

    // "accessed with ['x']" => "accessed with {{get ... 'x'}}"
    return messageText.replace(/\[(['"])(.*)\1\]/, `{{get ... $1$2$1}}`);
  }
}

function addGlintDetails(diagnostic: Diagnostic, details: string): ts.DiagnosticMessageChain {
  let { category, code, messageText } = diagnostic;

  return {
    category,
    code,
    messageText: details,
    next: [typeof messageText === 'string' ? { category, code, messageText } : messageText],
  };
}

// Find the nearest mapping node at or above the given one whose `source` AST node
// matches one of the given types.
function findAncestor<K extends MappingSource['type']>(
  mapping: MappingTree,
  ...types: Array<K>
): Extract<MappingSource, { type: K }> | null {
  let current: MappingTree | null = mapping;
  do {
    if (types.includes(current.sourceNode.type as K)) {
      return current.sourceNode as Extract<MappingSource, { type: K }>;
    }
  } while ((current = current.parent));
  return null;
}
