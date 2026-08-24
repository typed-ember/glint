import { toTree } from 'ember-estree';
import * as path from 'node:path';
import { GlintEnvironment } from '../../config/index.js';
import type { PreprocessData } from '../../environment-ember-template-imports/-private/environment/common.js';
import {
  EmbeddedTemplate,
  ImportedBindings,
  PartialCorrelatedSpan,
  TemplateThisBinding,
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
 * Like `rewriteModule`, but without a TypeScript compiler API.
 *
 * `rewriteModule` parses the content-tag-preprocessed script with the
 * `TSLib` it is given and reads three things off the AST: where each
 * template sits, how its `{{this}}` binds, and which names the module imports.
 * Here the same facts come from the ESTree that `ember-estree` (content-tag +
 * oxc-parser) produces for the file, so embedders that pair the transform
 * with a compiler that has no JS API (TypeScript 7, build plugins, content
 * mappers) do not need a second TypeScript install just to run the transform.
 *
 * The output is identical to `rewriteModule`'s for the same input; the
 * language server, tsserver plugin and `ember-tsc` keep using `rewriteModule`.
 * Exposed only as `@glint/ember-tsc/transform/standalone` so that those paths
 * never load ember-estree (and oxc-parser's native binary).
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
type Ancestor = { node: Node; key: string };

type Program = Node & { body: Array<Node> };
type ImportDeclaration = Node & {
  source: { value: string };
  specifiers: Array<
    Node & { local: { name: string }; imported?: { name?: string; value?: string } }
  >;
};

type Placement = {
  thisBinding: TemplateThisBinding;
  isExpressionStatement: boolean;
};

type ScriptAnalysis = {
  imports: ImportedBindings;
  /** Keyed by the offset of each template's `<template>` tag. */
  placements: Map<number, Placement>;
};

/**
 * Reads import bindings and the syntactic placement of every template from
 * the module's ESTree. The walk runs over ember-estree's outer JS/TS tree
 * before the templates are spliced in, where each `<template>` is still a
 * same-length placeholder starting at the tag's offset, so the placeholder's
 * ancestors are exactly the template's.
 */
function analyzeScript(contents: string, filename: string): ScriptAnalysis {
  let analysis: ScriptAnalysis = { imports: {}, placements: new Map() };
  let analyzed = false;

  try {
    toTree(contents, {
      filePath: filename,
      visitors: (file) => {
        let program = (file as unknown as { program: Program }).program;
        collectImportedBindings(program, analysis.imports);
        walk(program, [], analysis.placements);
        analyzed = true;
        return null;
      },
    });
  } catch (error) {
    // After the visitor factory has run, ember-estree parses each template's
    // handlebars to splice it into the tree and throws on a syntax error.
    // Everything needed here was gathered before that point, and the template
    // error itself is reported by `calculateTemplateSpans`.
    if (!analyzed) throw error;
  }

  return analysis;
}

const SKIPPED_KEYS = new Set(['parent', 'loc', 'range', 'tokens', 'comments']);

function walk(node: Node, ancestors: Array<Ancestor>, placements: Map<number, Placement>): void {
  if (isPlaceholderShape(node) && typeof node.start === 'number' && !placements.has(node.start)) {
    // Only the placeholders start exactly at a template's tag; the offsets
    // that miss are user-authored expressions and static blocks, and their
    // entries are simply never looked up.
    placements.set(node.start, {
      thisBinding: templateThisBinding(ancestors),
      isExpressionStatement: isExpressionStatement(ancestors),
    });
  }

  for (let [key, child] of Object.entries(node)) {
    if (SKIPPED_KEYS.has(key)) continue;
    if (Array.isArray(child)) {
      for (let item of child) {
        if (isNode(item)) walk(item, ancestors.concat({ node, key }), placements);
      }
    } else if (isNode(child)) {
      walk(child, ancestors.concat({ node, key }), placements);
    }
  }
}

// ember-estree stands each expression template in with a same-length
// template literal (`void `...`` from 0.8, a bare backtick literal before) and
// each class member with a `static{`...`}` block.
function isPlaceholderShape(node: Node): boolean {
  return (
    node.type === 'TemplateLiteral' ||
    node.type === 'UnaryExpression' ||
    node.type === 'StaticBlock'
  );
}

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && typeof (value as Node).type === 'string';
}

// Mirrors `templateThisBinding` in `inlining/index.ts`, which walks up the TS
// AST and stops at the first static block, heritage clause or class it meets.
function templateThisBinding(ancestors: Array<Ancestor>): TemplateThisBinding {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    let { node, key } = ancestors[i];
    switch (node.type) {
      case 'StaticBlock':
        return 'backing-class';
      case 'ClassDeclaration':
      case 'ClassExpression':
        if (key === 'superClass' || key === 'implements') return 'context';
        break;
      case 'ClassBody':
        return 'lexical';
    }
  }
  return 'context';
}

// Mirrors `isETIDefaultTemplate` / `isETIDefaultSatisfiesTemplate` in the
// environment transform: the template is the whole expression of an
// expression statement, optionally through a `satisfies`.
function isExpressionStatement(ancestors: Array<Ancestor>): boolean {
  let parent = ancestors[ancestors.length - 1]?.node;
  if (parent?.type === 'TSSatisfiesExpression') {
    parent = ancestors[ancestors.length - 2]?.node;
  }
  return parent?.type === 'ExpressionStatement';
}

// Mirrors `collectImportedBindings` in `inlining/tagged-strings.ts`.
function collectImportedBindings(program: Program, result: ImportedBindings): void {
  for (let statement of program.body) {
    if (statement.type !== 'ImportDeclaration') continue;

    let { source, specifiers } = statement as ImportDeclaration;
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
}
