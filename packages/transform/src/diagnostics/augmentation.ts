import type ts from 'typescript';
import { Diagnostic } from '.';
import MappingTree, { MappingSource } from '../template/mapping-tree';

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
  2554: adjustArgumentArity, // TS2554: Expected N arguments, but got M.
  2555: adjustArgumentArity, // TS2555: Expected at least N arguments, but got M.
  2769: checkResolveError, // TS2769: No overload matches this call.
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
    node.type === 'MustacheStatement' &&
    (parentNode.type === 'Template' ||
      parentNode.type === 'BlockStatement' ||
      parentNode.type === 'ElementNode')
  ) {
    // Otherwise, if it's on a full {{mustache}} and it's in a top-level position,
    // it's a DOM content type issue.
    return addGlintDetails(
      message,
      'Only primitive values and certain DOM objects (see `ContentValue` in `@glint/template`) are ' +
        'usable as top-level template content.'
    );
  }
}

function adjustArgumentArity(
  diagnostic: Diagnostic,
  mapping: MappingTree
): string | ts.DiagnosticMessageChain {
  // For normal template entity invocations, named args count as a function argument,
  // so TS reports one more required and passed positional arg than is actual visible
  // in the template. For `{{yield}}`, there are two extra args (𝚪 and the block name).
  //
  // Since (at least in English) TS always says "arguments" regardless of the
  // actual plurality, we can just blindly subtract 1 (or 2 for yields) from all numeric
  // patterns in the message.
  let callNode = findAncestor(mapping, 'MustacheStatement', 'SubExpression');
  let delta = callNode?.path.loc.asString() === 'yield' ? 2 : 1;

  return mapMessageText(diagnostic.messageText, (message) =>
    message.replace(/\d+/g, (n) => `${Number(n) - delta}`)
  );
}

function mapMessageText<T extends string | ts.DiagnosticMessageChain>(
  message: T,
  mapper: (text: string) => string
): T {
  if (typeof message === 'string') {
    return mapper(message) as T;
  } else {
    return {
      ...(message as ts.DiagnosticMessageChain),
      messageText: mapper(message.messageText),
      next: message.next?.map((next) => mapMessageText(next, mapper)),
    } as T;
  }
}

function checkResolveError(
  diagnostic: Diagnostic,
  mapping: MappingTree
): ts.DiagnosticMessageChain | undefined {
  let nodeType = mapping.sourceNode.type;
  if (nodeType === 'ElementNode' || nodeType === 'PathExpression' || nodeType === 'Identifier') {
    return addGlintDetails(
      diagnostic,
      'The given value does not appear to be usable as a component, modifier or helper.'
    );
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
