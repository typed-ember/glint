import { toTree, VisitorPath } from 'ember-estree';
import * as path from 'node:path';
import { GlintEnvironment } from '../../config/index.js';
import type { PreprocessData } from '../../environment-ember-template-imports/-private/environment/common.js';
import {
  EmbeddedTemplate,
  ImportedBindings,
  PartialCorrelatedSpan,
  TemplateThisBinding,
  ThisBindingAncestor,
  thisBindingFromAncestors,
} from './inlining/index.js';
import { calculateTemplateSpans } from './inlining/tagged-strings.js';
import {
  buildTransformedModule,
  parseError,
  RewriteInput,
  toTransformError,
} from './rewrite-module.js';
import TransformedModule, { Directive, TransformError } from './transformed-module.js';

/**
 * What the transform needs to know about a script beyond its text: which
 * names it imports, and where each `<template>` sits. `rewriteModule` reads
 * this off the TypeScript AST; this entry reads it off ember-estree's.
 */
type ScriptAnalysis = {
  imports: ImportedBindings;
  /**
   * Keyed by the offset of each template's `<template>` tag. A template with
   * no entry is emitted as a context-bound expression (`{{this}}` is the
   * template context) with no `export default`.
   */
  placements: Map<number, TemplatePlacement>;
};

type TemplatePlacement = {
  thisBinding: TemplateThisBinding;
  /**
   * Whether the template is the whole of an expression statement: the RFC 931
   * implicit `export default` form.
   */
  isExpressionStatement: boolean;
};

/**
 * Like `rewriteModule`, but without a TypeScript compiler API.
 *
 * The script is analyzed with ember-estree (content-tag + oxc-parser), so
 * embedders that pair the transform with a compiler that has no JS API
 * (TypeScript 7, build plugins, content mappers) do not need a second
 * TypeScript install just to run the transform. The output is identical to
 * `rewriteModule`'s for the same input.
 *
 * oxc does not recover from script syntax errors: on an unrecoverable error
 * it yields an empty program (TypeScript's parser keeps going), and the
 * templates in that file are then emitted without import bindings or
 * placement. At build time that is fine: the type-checker reports the syntax
 * error and nothing else about the file matters. In an editor it means the
 * templates of a file lose their imports and `this` binding while the script
 * is mid-edit. Glint's own editor paths (the Volar language server and the
 * tsserver plugin) run inside TypeScript and use `rewriteModule`, whose
 * parser recovers. A TypeScript 7 content mapper has no such parser and
 * should treat a file with script errors as stale (ember-estree reports them
 * on `ast.errors`) rather than serve a degraded transform for it.
 *
 * Exposed only as `@glint/ember-tsc/transform/standalone` so that the
 * language server, tsserver plugin and `ember-tsc` never load ember-estree
 * (and oxc-parser's native binary).
 */
export function rewriteModuleStandalone(
  { script }: RewriteInput,
  environment: GlintEnvironment,
): TransformedModule | null {
  let { filename, contents } = script;
  let { preprocess } = environment.getConfigForExtension(path.extname(filename)) ?? {};

  if (!preprocess) {
    return null;
  }

  let errors: Array<TransformError> = [];
  let directives: Array<Directive> = [];
  let partialSpans: Array<PartialCorrelatedSpan> = [];

  let data: PreprocessData;
  try {
    data = preprocess(contents, filename).data;
  } catch (e) {
    errors.push(toTransformError(parseError(e, filename), script));
    return buildTransformedModule(script, { errors, directives, partialSpans });
  }

  if (!data.templateLocations.length) {
    return null;
  }

  let { imports, placements } = analyzeScript(contents, filename);

  for (let location of data.templateLocations) {
    let start = location.startTagOffset;
    let end = location.endTagOffset + location.endTagLength;
    let contentStart = location.startTagOffset + location.startTagLength;
    let contentEnd = location.endTagOffset;
    let placement = placements.get(start);

    let embedded: EmbeddedTemplate = {
      template: contents.slice(contentStart, contentEnd),
      templateLocation: { start, end, contentStart, contentEnd },
      thisBinding: placement?.thisBinding ?? 'context',
    };

    if (location.type === 'class-member') {
      // The class's own template. `rewriteModule` rewrites the preprocessed
      // `;[___T`...`]` member into a static block and emits the template
      // inside it; see `isETITemplateProperty` in the environment transform.
      embedded.thisBinding = 'backing-class';
      embedded.prepend = 'static { ';
      embedded.append = ' }';
    } else if (placement?.isExpressionStatement) {
      // A template that is the whole of an expression statement is the
      // implicit default export (RFC 931); see `isETIDefaultTemplate` and
      // `isETIDefaultSatisfiesTemplate` in the environment transform.
      embedded.prepend = 'export default ';
    }

    let result = calculateTemplateSpans(embedded, imports, script, environment);
    errors.push(...result.errors);
    directives.push(...result.directives);
    partialSpans.push(...result.partialSpans);
  }

  return buildTransformedModule(script, { errors, directives, partialSpans });
}

type Node = { type: string; start?: number; end?: number };

type ImportDeclaration = Node & {
  source: { value: string };
  specifiers: Array<
    Node & { local: { name: string }; imported?: { name?: string; value?: string } }
  >;
};

type ClassNode = Node & { superClass?: Node | null; implements?: Array<Node> };

// ember-estree splices a `GlimmerTemplate` in place of the whole expression
// statement when the two span the same range, so the template's parent is
// then the statement list itself rather than the `ExpressionStatement`.
const STATEMENT_LISTS = new Set(['Program', 'BlockStatement', 'StaticBlock', 'SwitchCase']);

/**
 * Reads import bindings and the syntactic placement of every template off
 * ember-estree's traversal of the module. See `rewriteModuleStandalone` for
 * what happens when the script does not parse.
 */
function analyzeScript(contents: string, filename: string): ScriptAnalysis {
  let imports: ImportedBindings = {};
  let placements = new Map<number, TemplatePlacement>();

  let place = (start: number, path: VisitorPath): void => {
    placements.set(start, {
      thisBinding: thisBindingFromAncestors(ancestorsOf(path)),
      isExpressionStatement: isExpressionStatement(path),
    });
  };

  toTree(contents, {
    filePath: filename,
    visitors: {
      ImportDeclaration(node) {
        collectImportedBindings(node as ImportDeclaration, imports);
      },
      GlimmerTemplate(node, path) {
        place(node.start as number, path);
      },
    },
    // A template that fails to parse still sits somewhere; the error itself
    // is reported by `calculateTemplateSpans`, which parses it again.
    onTemplateError(_error, { range, path }) {
      place(range[0], path);
    },
  });

  return { imports, placements };
}

function* ancestorsOf(path: VisitorPath): Generator<ThisBindingAncestor> {
  for (
    let child = path, parent = path.parentPath;
    parent;
    child = parent, parent = parent.parentPath
  ) {
    let node = parent.node;
    switch (node.type) {
      case 'StaticBlock':
        yield 'static-block';
        break;
      case 'ClassDeclaration':
      case 'ClassExpression': {
        let { superClass, implements: implemented } = node as ClassNode;
        if (superClass === child.node || implemented?.includes(child.node)) yield 'heritage-clause';
        break;
      }
      case 'ClassBody':
        yield 'class';
        break;
    }
  }
}

function isExpressionStatement(path: VisitorPath): boolean {
  let parent = path.parent;
  if (parent?.type === 'TSSatisfiesExpression') {
    return path.parentPath?.parent?.type === 'ExpressionStatement';
  }
  return (
    parent !== null && (parent.type === 'ExpressionStatement' || STATEMENT_LISTS.has(parent.type))
  );
}

function collectImportedBindings(statement: ImportDeclaration, result: ImportedBindings): void {
  let { source, specifiers } = statement;
  for (let specifier of specifiers) {
    if (specifier.type === 'ImportDefaultSpecifier') {
      result[specifier.local.name] = {
        specifier: 'default',
        source: source.value,
        synthetic: false,
      };
    } else if (specifier.type === 'ImportSpecifier' && specifier.imported) {
      result[specifier.local.name] = {
        specifier: specifier.imported.name ?? specifier.imported.value ?? specifier.local.name,
        source: source.value,
        synthetic: false,
      };
    }
  }
}
