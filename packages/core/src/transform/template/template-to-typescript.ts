import { AST } from '@glimmer/syntax';
import { GlintEmitMetadata, GlintSpecialForm } from '@glint/ember-tsc/config-types';
import { assert, unreachable } from '../util.js';
import { TextContent } from './glimmer-ast-mapping-tree.js';
import { EmbeddingSyntax, mapTemplateContents, RewriteResult } from './map-template-contents.js';
import ScopeStack from './scope-stack.js';

const SPLATTRIBUTES = '...attributes';

export type TemplateToTypescriptOptions = {
  typesModule: string;
  meta?: GlintEmitMetadata | undefined;
  globals?: Array<string> | undefined;
  backingValue?: string;
  preamble?: Array<string>;
  embeddingSyntax?: EmbeddingSyntax;
  useJsDoc?: boolean;
  specialForms?: Record<string, GlintSpecialForm>;
};

/**
 * NOTE: this is tech debt. Tho solving it will require more work than polyfilling old behavior of path.parts
 * @param node
 * @returns
 */
function getPathParts(node: AST.PathExpression): string[] {
  // The original code which used old @glimmer/syntax used node.parts,
  // which never included the @ of the path.
  let atLess = node.head.original.replace(/^@/, '');

  // The original path.parts array did not include "this" in the parts.
  if (atLess === 'this') return node.tail;

  return [atLess, ...node.tail];
}

/**
 * Given the text contents of a template, returns a  TypeScript representation
 * of that template's contents, as well as a mapping of offsets and ranges between
 * the original and transformed contents.
 */
export function templateToTypescript(
  originalTemplate: string,
  {
    typesModule,
    globals,
    meta,
    backingValue,
    preamble = [],
    embeddingSyntax = { prefix: '', suffix: '' },
    specialForms = {},
    useJsDoc = false,
  }: TemplateToTypescriptOptions,
): RewriteResult {
  let { prefix, suffix } = embeddingSyntax;
  let template = `${''.padEnd(prefix.length)}${originalTemplate}${''.padEnd(suffix.length)}`;

  return mapTemplateContents(originalTemplate, { embeddingSyntax }, (ast, mapper) => {
    let { rangeForNode } = mapper;
    let scope = new ScopeStack([]);
    let inHtmlContext: 'svg' | 'math' | 'default' = 'default';

    emitTemplateBoilerplate(() => {
      for (let statement of ast?.body ?? []) {
        emitTopLevelStatement(statement);
      }
    });

    return;

    function emitTopLevelStatement(node: AST.TopLevelStatement): void {
      switch (node.type) {
        case 'Block':
          throw new Error(`Internal error: unexpected top-level ${node.type}`);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        case 'PartialStatement':
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          throw new Error(`Internal error: unexpected top-level ${node.type}`);

        case 'TextNode':
          return emitTopLevelTextNode(node);

        case 'CommentStatement':
        case 'MustacheCommentStatement':
          return emitComment(node);

        case 'MustacheStatement':
          return emitTopLevelMustacheStatement(node);

        case 'BlockStatement':
          return emitBlockStatement(node);

        case 'ElementNode':
          return emitElementNode(node);

        default:
          unreachable(node);
      }
    }

    function emitTemplateBoilerplate(emitBody: () => void): void {
      if (meta?.prepend) {
        mapper.text(meta.prepend);
      }

      if (useJsDoc) {
        mapper.text(`(/** @type {typeof import(`);
        if (ast) {
          mapper.forNode(ast, () => {
            mapper.text(`"${typesModule}"`);
          });
        } else {
          mapper.text(`"${typesModule}"`);
        }
        mapper.text(`)} */ ({}))`);
      } else {
        mapper.text(`({} as typeof import(`);
        if (ast) {
          mapper.forNode(ast, () => {
            mapper.text(`"${typesModule}"`);
          });
        } else {
          mapper.text(`"${typesModule}"`);
        }
        mapper.text(`))`);
      }

      if (backingValue) {
        mapper.text(`.templateForBackingValue(${backingValue}, function(__glintRef__`);
      } else {
        mapper.text(`.templateExpression(function(__glintRef__`);
      }

      if (useJsDoc) {
        mapper.text(`, /** @type {typeof import("${typesModule}")} */ __glintDSL__) {`);
      } else {
        mapper.text(`, __glintDSL__: typeof import("${typesModule}")) {`);
      }

      mapper.newline();
      mapper.indent();

      for (let line of preamble) {
        mapper.text(line);
        mapper.newline();
      }

      if (ast) {
        mapper.forNode(ast, emitBody);
      }

      // Ensure the context and lib variables are always consumed to prevent
      // an unused variable warning
      mapper.text('__glintRef__; __glintDSL__;');
      mapper.newline();

      mapper.emitDirectivePlaceholders();

      mapper.dedent();
      mapper.text('})');

      if (meta?.append) {
        mapper.text(meta.append);
      }
    }

    function emitTopLevelTextNode(node: AST.TextNode): void {
      // We don't need to emit any code for text nodes, but we want to track
      // where they are so we know NOT to try and suggest global completions
      // in "text space" where it wouldn't make sense.
      mapper.nothing(node, new TextContent());
    }

    function emitComment(node: AST.MustacheCommentStatement | AST.CommentStatement): void {
      let text = node.value.trim();
      const directiveRegex = /^@glint-([a-z-]+)/i;
      let match = directiveRegex.exec(text);
      if (!match) {
        return mapper.nothing(node);
      }

      emitDirective(match, node);
    }

    function emitDirective(
      match: RegExpExecArray,
      node: AST.CommentStatement | AST.MustacheCommentStatement,
    ): void {
      let kind = match[1];
      let location = rangeForNode(node);
      if (kind === 'ignore' || kind === 'expect-error') {
        mapper.directive(kind, node, location, mapper.rangeForLine(node.loc.end.line + 1));
      } else if (kind === 'nocheck') {
        mapper.directive('ignore', node, location, { start: 0, end: template.length - 1 });
      } else if (kind === 'in-svg') {
        inHtmlContext = 'svg';
      } else if (kind === 'in-mathml') {
        inHtmlContext = 'math';
      } else if (kind === 'out-svg' || kind === 'out-mathml') {
        inHtmlContext = 'default';
      } else {
        // Push an error on the record
        mapper.error(`Unknown directive @glint-${kind}`, location);
      }
    }

    function emitTopLevelMustacheStatement(node: AST.MustacheStatement): void {
      emitMustacheStatement(node, 'top-level');
      mapper.text(';');
      mapper.newline();
    }

    // Captures the context in which a given invocation (i.e. a mustache or
    // sexpr) is being performed. Certain keywords like `yield` are only
    // valid in certain positions, and whether a param-less mustache implicitly
    // evaluates a helper or returns it also depends on the location it's in.
    type InvokePosition = 'top-level' | 'attr' | 'arg' | 'concat' | 'sexpr';

    function emitSpecialFormExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression,
      position: InvokePosition,
    ): void {
      if (formInfo.requiresConsumption) {
        mapper.text('(__glintDSL__.noop(');
        emitExpression(node.path);
        mapper.text('), ');
      }

      switch (formInfo.form) {
        case 'yield':
          emitYieldExpression(formInfo, node, position);
          break;

        case 'if':
          emitIfExpression(formInfo, node);
          break;

        case 'if-not':
          emitIfNotExpression(formInfo, node);
          break;

        case 'object-literal':
          emitObjectExpression(formInfo, node);
          break;

        case 'array-literal':
          emitArrayExpression(formInfo, node);
          break;

        case 'bind-invokable':
          emitBindInvokableExpression(formInfo, node, position);
          break;

        case '===':
        case '!==':
          emitBinaryOperatorExpression(formInfo, node);
          break;

        case '&&':
        case '||':
          emitLogicalExpression(formInfo, node);
          break;

        case '!':
          emitUnaryOperatorExpression(formInfo, node);
          break;

        default:
          mapper.error(`${formInfo.name} is not valid in inline form`, rangeForNode(node));
          mapper.text('undefined');
      }

      if (formInfo.requiresConsumption) {
        mapper.text(')');
      }
    }

    function emitBindInvokableExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression,
      position: InvokePosition,
    ): void {
      mapper.forNode(node, () => {
        assert(
          node.params.length >= 1,
          () => `{{${formInfo.name}}} requires at least one positional argument`,
        );

        assert(
          node.params.length === 1 || node.hash.pairs.length === 0,
          () =>
            `Due to TypeScript inference limitations, {{${formInfo.name}}} can only pre-bind ` +
            `either named or positional arguments in a single pass. You can instead break the ` +
            `binding into two parts, e.g. ` +
            `{{${formInfo.name} (${formInfo.name} ... posA posB) namedA=true namedB=true}}`,
        );

        if (position === 'top-level') {
          mapper.text('__glintDSL__.emitContent(');
        }

        // Treat the first argument to a bind-invokable expression (`{{component}}`,
        // `{{helper}}`, etc) as special: we wrap it in a `resolve` call so that the
        // type machinery for those helpers can always operate against the resolved value.
        // We wrap the `resolveForBind` call in an IIFE to prevent "backpressure" in
        // type inference from the subsequent arguments that are being passed: the bound
        // invokable is the source of record for its own type and we don't want inference
        // from the `resolveForBind` call to be affected by other (potentially incorrect)
        // parameter types.
        mapper.text('__glintDSL__.resolve(');
        emitExpression(node.path);
        mapper.text(')((() => __glintDSL__.resolveForBind(');
        emitExpression(node.params[0]);
        mapper.text('))(), ');
        emitArgs(node.params.slice(1), node.hash);
        mapper.text(')');

        if (position === 'top-level') {
          mapper.text(')');
        }
      });
    }

    function emitObjectExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression,
    ): void {
      mapper.forNode(node, () => {
        assert(
          node.params.length === 0,
          () => `{{${formInfo.name}}} only accepts named parameters`,
        );

        if (!node.hash.pairs.length) {
          mapper.text('{}');
          return;
        }

        mapper.text('({');
        mapper.indent();
        mapper.newline();

        let start = template.indexOf('hash', rangeForNode(node).start) + 4;
        for (let pair of node.hash.pairs) {
          start = template.indexOf(pair.key, start);
          emitHashKey(pair.key, start);
          mapper.text(': ');
          emitExpression(pair.value);
          mapper.text(',');
          mapper.newline();
        }

        mapper.dedent();
        mapper.text('})');
      });
    }

    function emitArrayExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression,
    ): void {
      mapper.forNode(node, () => {
        assert(
          node.hash.pairs.length === 0,
          () => `{{${formInfo.name}}} only accepts positional parameters`,
        );

        mapper.text('[');

        for (let [index, param] of node.params.entries()) {
          emitExpression(param);

          if (index < node.params.length - 1) {
            mapper.text(', ');
          }
        }

        mapper.text(']');
      });
    }

    function emitIfExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression,
    ): void {
      mapper.forNode(node, () => {
        assert(
          node.params.length >= 2,
          () => `{{${formInfo.name}}} requires at least two parameters`,
        );

        mapper.text('(');
        emitExpression(node.params[0]);
        mapper.text(') ? (');
        emitExpression(node.params[1]);
        mapper.text(') : (');

        if (node.params[2]) {
          emitExpression(node.params[2]);
        } else {
          mapper.text('undefined');
        }

        mapper.text(')');
      });
    }

    function emitIfNotExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression,
    ): void {
      mapper.forNode(node, () => {
        assert(
          node.params.length >= 2,
          () => `{{${formInfo.name}}} requires at least two parameters`,
        );

        mapper.text('!(');
        emitExpression(node.params[0]);
        mapper.text(') ? (');
        emitExpression(node.params[1]);
        mapper.text(') : (');

        if (node.params[2]) {
          emitExpression(node.params[2]);
        } else {
          mapper.text('undefined');
        }

        mapper.text(')');
      });
    }

    function emitBinaryOperatorExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression,
    ): void {
      mapper.forNode(node, () => {
        assert(
          node.hash.pairs.length === 0,
          () => `{{${formInfo.name}}} only accepts positional parameters`,
        );
        assert(
          node.params.length === 2,
          () => `{{${formInfo.name}}} requires exactly two parameters`,
        );

        const [left, right] = node.params;

        mapper.text('(');
        emitExpression(left);
        mapper.text(` ${formInfo.form} `);
        emitExpression(right);
        mapper.text(')');
      });
    }

    function emitLogicalExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression,
    ): void {
      mapper.forNode(node, () => {
        assert(
          node.hash.pairs.length === 0,
          () => `{{${formInfo.name}}} only accepts positional parameters`,
        );
        assert(
          node.params.length >= 2,
          () => `{{${formInfo.name}}} requires at least two parameters`,
        );

        mapper.text('(');
        for (const [index, param] of node.params.entries()) {
          emitExpression(param);

          if (index < node.params.length - 1) {
            mapper.text(` ${formInfo.form} `);
          }
        }
        mapper.text(')');
      });
    }

    function emitUnaryOperatorExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression,
    ): void {
      mapper.forNode(node, () => {
        assert(
          node.hash.pairs.length === 0,
          () => `{{${formInfo.name}}} only accepts positional parameters`,
        );
        assert(
          node.params.length === 1,
          () => `{{${formInfo.name}}} requires exactly one parameter`,
        );

        const [param] = node.params;

        mapper.text(formInfo.form);
        emitExpression(param);
      });
    }

    type SpecialFormInfo = {
      form: GlintSpecialForm;
      name: string;
      requiresConsumption: boolean;
    };

    function checkSpecialForm(node: AST.CallNode): SpecialFormInfo | null {
      if (
        node.path.type === 'PathExpression' &&
        node.path.head.type === 'VarHead' &&
        !node.path.tail.length
      ) {
        let name = node.path.head.name;
        if (typeof specialForms[name] === 'string' && !scope.hasBinding(name)) {
          let isGlobal = globals ? globals.includes(name) : true;
          let form = specialForms[name];

          return { name, form, requiresConsumption: !isGlobal };
        }
      }

      return null;
    }

    function emitExpression(node: AST.Expression): void {
      switch (node.type) {
        case 'PathExpression':
          return emitPath(node);

        case 'SubExpression':
          return emitSubExpression(node);

        case 'BooleanLiteral':
        case 'NullLiteral':
        case 'NumberLiteral':
        case 'StringLiteral':
        case 'UndefinedLiteral':
          return emitLiteral(node);

        default:
          unreachable(node);
      }
    }

    function emitElementNode(node: AST.ElementNode): void {
      let firstCharacter = node.tag.charAt(0);
      if (
        firstCharacter.toUpperCase() === firstCharacter ||
        node.tag.includes('.') ||
        scope.hasBinding(node.tag)
      ) {
        emitComponent(node);
      } else {
        emitPlainElement(node);
      }
    }

    function emitConcatStatement(node: AST.ConcatStatement): void {
      mapper.forNode(node, () => {
        mapper.text('`');
        for (let part of node.parts) {
          if (part.type === 'MustacheStatement') {
            mapper.text('$' + '{');
            emitMustacheStatement(part, 'concat');
            mapper.text('}');
          }
        }
        mapper.text('`');
      });
    }

    function emitIdentifierReference(name: string, hbsOffset: number): void {
      if (treatAsGlobal(name)) {
        mapper.text('__glintDSL__.Globals["');
        mapper.identifier(JSON.stringify(name).slice(1, -1), hbsOffset, name.length);
        mapper.text('"]');
      } else {
        mapper.identifier(makeJSSafe(name), hbsOffset, name.length);
      }
    }

    function treatAsGlobal(name: string): boolean {
      if (globals) {
        // If we have a known set of global identifiers, we should only treat
        // members of that set as global, unless the identifier is in scope,
        // and assume everything else is local. This is typically true in
        // environments that capture scope, like strict-mode Ember.
        return globals.includes(name) && !scope.hasBinding(name);
      } else {
        // Otherwise, we assume everything is global unless we can see it
        // in scope as a block variable. This is the case in resolver-based
        // environments like loose-mode Ember.
        return !scope.hasBinding(name);
      }
    }

    function tagNameToPathContents(node: AST.ElementNode): {
      start: number;
      kind: PathKind;
      path: Array<string>;
    } {
      let tagName = node.tag;
      let start = template.indexOf(tagName, rangeForNode(node).start);

      if (tagName.startsWith('@')) {
        return {
          start,
          kind: 'arg',
          path: tagName.slice(1).split('.'),
        };
      } else if (tagName.startsWith('this.')) {
        return {
          start,
          kind: 'this',
          path: tagName.slice('this.'.length).split('.'),
        };
      } else {
        return {
          start,
          kind: 'free',
          path: tagName.split('.'),
        };
      }
    }

    function emitComponent(node: AST.ElementNode): void {
      mapper.forNode(node, () => {
        let { start, path, kind } = tagNameToPathContents(node);

        for (let comment of node.comments) {
          emitComment(comment);
        }

        mapper.text('{');
        mapper.newline();
        mapper.indent();

        // Resolve the component and stash into the `__glintY__` variable for later invocation.
        mapper.text('const __glintY__ = __glintDSL__.emitComponent(');

        // Error boundary: "Expected 1 arguments, but got 0." e.g. when invoking `<ComponentThatHasArgs />`
        mapper.forNode(node.path, () => {
          mapper.text('__glintDSL__.resolve(');
          emitPathContents(path, start, kind);
          mapper.text(')');
        });

        // "Call" the component, optionally passing args if they are provided in the template.
        mapper.text('(');

        let dataAttrs = node.attributes.filter(({ name }) => name.startsWith('@'));
        if (dataAttrs.length) {
          // Error boundary: "Expected 0 arguments, but got 1." e.g. when invoking `<ComponentThatHasNoArgs @foo={{bar}} />`
          mapper.forNodeWithSpan(node, node.openTag, () => {
            mapper.text('{ ');

            for (let attr of dataAttrs) {
              mapper.forNode(attr, () => {
                mapper.newline();

                const attrStartOffset = attr.loc.getStart().offset!;
                emitHashKey(attr.name.slice(1), attrStartOffset + prefix.length + 1);
                mapper.text(': ');

                switch (attr.value.type) {
                  case 'TextNode':
                    mapper.text(JSON.stringify(attr.value.chars));
                    break;
                  case 'ConcatStatement':
                    emitConcatStatement(attr.value);
                    break;
                  case 'MustacheStatement':
                    emitMustacheStatement(attr.value, 'arg');
                    break;
                  default:
                    unreachable(attr.value);
                }
              });

              start = rangeForNode(attr.value).end;
              mapper.text(', ');
            }

            mapper.text('...__glintDSL__.NamedArgsMarker }');
          });
        }

        mapper.text('));');
        mapper.newline();

        emitAttributesAndModifiers(node);

        if (!node.selfClosing) {
          let blocks = determineBlockChildren(node);
          if (blocks.type === 'named') {
            for (const child of blocks.children) {
              if (child.type === 'CommentStatement' || child.type === 'MustacheCommentStatement') {
                emitComment(child);
                continue;
              }

              let childStart = rangeForNode(child).start;
              let nameStart = template.indexOf(child.tag, childStart) + ':'.length;
              let blockParamsStart = template.indexOf('|', childStart);
              let name = child.tag.slice(1);

              mapper.forNode(child, () =>
                emitBlockContents(
                  name,
                  nameStart,
                  child.blockParams,
                  blockParamsStart,
                  child.children,
                ),
              );
            }
          } else {
            let blockParamsStart = template.indexOf('|', rangeForNode(node).start);
            emitBlockContents(
              'default',
              undefined,
              node.blockParams,
              blockParamsStart,
              blocks.children,
            );
          }
        }

        mapper.dedent();
        mapper.text('}');
        mapper.newline();
      });
    }

    function isAllowedAmongNamedBlocks(node: AST.Node): boolean {
      return (
        (node.type === 'TextNode' && node.chars.trim() === '') ||
        node.type === 'CommentStatement' ||
        node.type === 'MustacheCommentStatement'
      );
    }

    function isNamedBlock(node: AST.Node): boolean {
      return node.type === 'ElementNode' && node.tag.startsWith(':');
    }

    type NamedBlockChild = AST.ElementNode | AST.CommentStatement | AST.MustacheCommentStatement;
    type BlockChildren =
      | { type: 'named'; children: NamedBlockChild[] }
      | { type: 'default'; children: AST.TopLevelStatement[] };

    function determineBlockChildren(node: AST.ElementNode): BlockChildren {
      let named = 0;
      let other = 0;

      for (let child of node.children) {
        if (isAllowedAmongNamedBlocks(child)) {
          continue;
        }

        if (isNamedBlock(child)) {
          named += 1;
        } else {
          other += 1;
        }
      }

      if (named === 0) {
        return { type: 'default', children: node.children };
      } else if (other === 0) {
        return {
          type: 'named',
          children: node.children.filter(
            // Filter out ignorable content between named blocks
            (child): child is NamedBlockChild => child.type === 'ElementNode',
            //  ||
            //   child.type === 'CommentStatement' ||
            //   child.type === 'MustacheCommentStatement',
          ),
        };
      } else {
        // If we get here, meaningful content was mixed with named blocks,
        // so it's worth doing the additional work to produce errors for
        // those nodes
        for (let child of node.children) {
          if (!isNamedBlock(child)) {
            mapper.forNode(child, () =>
              assert(
                isAllowedAmongNamedBlocks(child),
                'Named blocks may not be mixed with other content',
              ),
            );
          }
        }

        return { type: 'named', children: [] };
      }
    }

    function emitPlainElement(node: AST.ElementNode): void {
      mapper.forNode(node, () => {
        if (node.tag === 'svg') {
          inHtmlContext = 'svg';
        }

        if (node.tag === 'math') {
          inHtmlContext = 'math';
        }

        for (let comment of node.comments) {
          emitComment(comment);
        }

        mapper.text('{');
        mapper.newline();
        mapper.indent();

        if (inHtmlContext === 'default') {
          mapper.text('const __glintY__ = __glintDSL__.emitElement("');
        } else if (inHtmlContext === 'svg') {
          mapper.text('const __glintY__ = __glintDSL__.emitSVGElement("');
        } else if (inHtmlContext === 'math') {
          mapper.text('const __glintY__ = __glintDSL__.emitMathMlElement("');
        }
        mapper.forNode(node.path, () => {
          mapper.text(node.tag);
        });
        mapper.text('");');
        mapper.newline();

        emitAttributesAndModifiers(node);

        for (let child of node.children) {
          emitTopLevelStatement(child);
        }

        if (node.tag === 'svg' || node.tag === 'math') {
          inHtmlContext = 'default';
        }

        mapper.dedent();
        mapper.text('}');
        mapper.newline();
      });
    }

    function emitAttributesAndModifiers(node: AST.ElementNode): void {
      emitSplattributes(node);
      emitPlainAttributes(node);
      emitModifiers(node);
    }

    function emitPlainAttributes(node: AST.ElementNode): void {
      let attributes = node.attributes.filter(
        (attr) => !attr.name.startsWith('@') && attr.name !== SPLATTRIBUTES,
      );

      // Only emit `applyAttributes` if there are attributes to apply.
      if (attributes.length === 0) return;

      const attrsSpan = node.openTag
        .withStart(node.path.loc.getEnd())
        .withEnd(node.openTag.getEnd().move(-1));
      mapper.forNodeWithSpan(node, attrsSpan, () => {
        let isFirstAttribute = true;

        for (let attr of attributes) {
          if (isFirstAttribute) {
            isFirstAttribute = false;

            mapper.text('__glintDSL__.applyAttributes(');

            // We map the `__glintY__.element` arg to the first attribute node, which has the effect
            // such that diagnostics due to passing attributes to invalid elements will show up
            // on the attribute, rather than on the whole element.
            mapper.forNode(attr, () => {
              mapper.text('__glintY__.element');
            });

            mapper.text(', {');
          }

          mapper.newline();
          mapper.indent();

          mapper.forNode(attr, () => {
            const attrStartOffset = attr.loc.getStart().offset!;
            emitHashKey(attr.name, attrStartOffset + prefix.length);
            mapper.text(': ');

            if (attr.value.type === 'MustacheStatement') {
              emitMustacheStatement(attr.value, 'attr');
            } else if (attr.value.type === 'ConcatStatement') {
              emitConcatStatement(attr.value);
            } else {
              mapper.text(JSON.stringify(attr.value.chars));
            }

            mapper.text(',');
            mapper.newline();
          });
        }
        mapper.newline();
      });
      mapper.newline();
      mapper.dedent();
      mapper.text('});');
      mapper.newline();
    }

    function emitSplattributes(node: AST.ElementNode): void {
      let splattributes = node.attributes.find((attr) => attr.name === SPLATTRIBUTES);
      if (!splattributes) return;

      assert(
        splattributes.value.type === 'TextNode' && splattributes.value.chars === '',
        '`...attributes` cannot accept a value',
      );

      mapper.forNode(splattributes, () => {
        mapper.text('__glintDSL__.applySplattributes(__glintRef__.element, __glintY__.element);');
      });

      mapper.newline();
    }

    function emitModifiers(node: AST.ElementNode): void {
      for (let modifier of node.modifiers) {
        mapper.forNode(modifier, () => {
          mapper.text('__glintDSL__.applyModifier(');

          mapper.forNode(modifier, () => {
            mapper.text('__glintDSL__.resolve(');
            emitExpression(modifier.path);
            mapper.text(')');
          });

          mapper.text('(__glintY__.element, ');
          emitArgs(modifier.params, modifier.hash);
          mapper.text('));');
          mapper.newline();
        });
      }
    }

    function emitMustacheStatement(node: AST.MustacheStatement, position: InvokePosition): void {
      let specialFormInfo = checkSpecialForm(node);
      if (specialFormInfo) {
        emitSpecialFormExpression(specialFormInfo, node, position);
        return;
      } else if (node.path.type !== 'PathExpression' && node.path.type !== 'SubExpression') {
        // This assertion is currently meaningless, as @glimmer/syntax silently drops
        // any named or positional parameters passed in a literal mustache
        assert(
          node.params.length === 0 && node.hash.pairs.length === 0,
          'Literals do not accept params',
        );

        emitLiteral(node.path);
        return;
      }

      mapper.forNode(node, () => {
        // If a mustache has parameters, we know it must be an invocation; if
        // not, it depends on where it appears. In arg position, it's always
        // passed directly as a value; otherwise it's invoked if it's a
        // component/helper, and returned as a value otherwise.
        let hasParams = Boolean(node.hash.pairs.length || node.params.length);
        if (!hasParams && position === 'arg' && !isGlobal(node.path)) {
          emitExpression(node.path);
        } else if (position === 'top-level') {
          // e.g. top-level mustache `{{someValue}}`
          mapper.text('__glintDSL__.emitContent(');
          emitResolve(node, hasParams ? 'resolve' : 'resolveOrReturn');
          mapper.text(')');
        } else {
          emitResolve(node, hasParams ? 'resolve' : 'resolveOrReturn');
        }
      });
    }

    function isGlobal(path: AST.Expression): boolean {
      return Boolean(
        path.type === 'PathExpression' &&
          path.head.type === 'VarHead' &&
          globals?.includes(path.head.name) &&
          !scope.hasBinding(path.head.name),
      );
    }

    function emitYieldExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression,
      position: InvokePosition,
    ): void {
      mapper.forNode(node, () => {
        assert(
          position === 'top-level',
          () => `{{${formInfo.name}}} may only appear as a top-level statement`,
        );

        let to = 'default';
        let toPair = node.hash.pairs.find((pair) => pair.key === 'to');
        if (toPair) {
          assert(
            toPair.value.type === 'StringLiteral',
            () => `Named block {{${formInfo.name}}}s must have a literal block name`,
          );
          to = toPair.value.value;
        }

        if (to === 'inverse') {
          to = 'else';
        }

        mapper.text('__glintDSL__.yieldToBlock(__glintRef__, ');
        mapper.text(JSON.stringify(to));
        mapper.text(')(');

        for (let [index, param] of node.params.entries()) {
          if (index) {
            mapper.text(', ');
          }

          emitExpression(param);
        }

        mapper.text(')');
      });
    }

    function emitSpecialFormStatement(formInfo: SpecialFormInfo, node: AST.BlockStatement): void {
      if (formInfo.requiresConsumption) {
        emitExpression(node.path);
        mapper.text(';');
        mapper.newline();
      }

      switch (formInfo.form) {
        case 'if':
          emitIfStatement(formInfo, node);
          break;

        case 'if-not':
          emitUnlessStatement(formInfo, node);
          break;

        case 'bind-invokable':
          mapper.error(
            `The {{${formInfo.name}}} helper can't be used directly in block form under Glint. ` +
              `Consider first binding the result to a variable, e.g. '{{#let (${formInfo.name} ...) as |...|}}' ` +
              `and then using the bound value.`,
            rangeForNode(node.path),
          );
          break;

        default:
          mapper.error(`${formInfo.name} is not valid in block form`, rangeForNode(node.path));
      }
    }

    function emitIfStatement(formInfo: SpecialFormInfo, node: AST.BlockStatement): void {
      mapper.forNode(node, () => {
        assert(
          node.params.length === 1,
          () => `{{#${formInfo.name}}} requires exactly one condition`,
        );

        mapper.text('if (');
        emitExpression(node.params[0]);
        mapper.text(') {');
        mapper.newline();
        mapper.indent();

        for (let statement of node.program.body) {
          emitTopLevelStatement(statement);
        }

        if (node.inverse) {
          mapper.dedent();
          mapper.text('} else {');
          mapper.indent();
          mapper.newline();

          for (let statement of node.inverse.body) {
            emitTopLevelStatement(statement);
          }
        }

        mapper.dedent();
        mapper.text('}');
        mapper.newline();
      });
    }

    function emitUnlessStatement(formInfo: SpecialFormInfo, node: AST.BlockStatement): void {
      mapper.forNode(node, () => {
        assert(
          node.params.length === 1,
          () => `{{#${formInfo.name}}} requires exactly one condition`,
        );

        mapper.text('if (!(');
        emitExpression(node.params[0]);
        mapper.text(')) {');
        mapper.newline();
        mapper.indent();

        for (let statement of node.program.body) {
          emitTopLevelStatement(statement);
        }

        if (node.inverse) {
          mapper.dedent();
          mapper.text('} else {');
          mapper.indent();
          mapper.newline();

          for (let statement of node.inverse.body) {
            emitTopLevelStatement(statement);
          }
        }

        mapper.dedent();
        mapper.text('}');
        mapper.newline();
      });
    }

    function emitBlockStatement(node: AST.BlockStatement): void {
      let specialFormInfo = checkSpecialForm(node);
      if (specialFormInfo) {
        emitSpecialFormStatement(specialFormInfo, node);
        return;
      }

      mapper.forNode(node, () => {
        mapper.text('{');
        mapper.newline();
        mapper.indent();

        mapper.text('const __glintY__ = __glintDSL__.emitComponent(');
        emitResolve(node, 'resolve');
        mapper.text(');');
        mapper.newline();

        emitBlock('default', node.program);

        if (node.inverse) {
          emitBlock('else', node.inverse);
        }

        // TODO: emit something corresponding to `{{/foo}}` like we do
        // for angle bracket components, so that symbol renames propagate?
        // A little hairier (ha) for mustaches, since they
        if (node.path.type === 'PathExpression') {
          let start = template.lastIndexOf(node.path.original, rangeForNode(node).end);
          emitPathContents(getPathParts(node.path), start, determinePathKind(node.path));
          mapper.text(';');
          mapper.newline();
        }

        mapper.dedent();
        mapper.text('}');
      });

      mapper.newline();
    }

    function emitBlock(name: string, node: AST.Block): void {
      let paramsStart = template.lastIndexOf(
        '|',
        template.lastIndexOf('|', rangeForNode(node).end) - 1,
      );

      emitBlockContents(name, undefined, node.blockParams, paramsStart, node.body);
    }

    function emitBlockContents(
      name: string,
      nameOffset: number | undefined,
      blockParams: string[],
      blockParamsOffset: number,
      children: AST.TopLevelStatement[],
    ): void {
      assert(
        blockParams.every((name) => !name.includes('-')),
        'Block params must be valid TypeScript identifiers',
      );

      scope.push(blockParams);

      mapper.text('{');
      mapper.newline();
      mapper.indent();

      mapper.text('const [');

      let start = blockParamsOffset;
      for (let [index, param] of blockParams.entries()) {
        if (index) mapper.text(', ');

        start = template.indexOf(param, start);
        mapper.identifier(makeJSSafe(param), start, param.length);
      }

      mapper.text('] = __glintY__.blockParams');
      emitPropertyAccesss(name, { offset: nameOffset, synthetic: true });
      mapper.text(';');
      mapper.newline();

      for (let statement of children) {
        emitTopLevelStatement(statement);
      }

      mapper.dedent();
      mapper.text('}');
      mapper.newline();
      scope.pop();
    }

    function emitSubExpression(node: AST.SubExpression): void {
      let specialFormInfo = checkSpecialForm(node);
      if (specialFormInfo) {
        emitSpecialFormExpression(specialFormInfo, node, 'sexpr');
        return;
      }

      mapper.forNode(node, () => {
        emitResolve(node, 'resolve');
      });
    }

    /** An AST node that represents an invocation of some template entity in curlies */
    type CurlyInvocationNode =
      | AST.MustacheStatement
      | AST.SubExpression
      | AST.BlockStatement
      | AST.ElementModifierStatement;

    function emitResolve(node: CurlyInvocationNode, resolveType: string): void {
      // We use forNode here to wrap the emitted resolve expression here so that when
      // we convert to Volar mappings, we can create a boundary around
      // e.g. "__glintDSL__.resolveOrReturn(expectsAtLeastOneArg)()", which is required because
      // this is where TS might generate a diagnostic error.
      mapper.forNode(node, () => {
        mapper.text('__glintDSL__.');
        mapper.text(resolveType);
        mapper.text('(');
        emitExpression(node.path);
        mapper.text(')(');
        emitArgs(node.params, node.hash);
        mapper.text(')');
      });
    }

    function emitArgs(positional: Array<AST.Expression>, named: AST.Hash): void {
      // Emit positional args
      for (let [index, param] of positional.entries()) {
        if (index) {
          mapper.text(', ');
        }

        emitExpression(param);
      }

      // Emit named args
      if (named.pairs.length) {
        if (positional.length) {
          mapper.text(', ');
        }

        // TS diagnostic error boundary
        mapper.forNode(named, () => {
          mapper.text('{ ');

          let { start } = rangeForNode(named);
          for (let [index, pair] of named.pairs.entries()) {
            start = template.indexOf(pair.key, start);
            emitHashKey(pair.key, start);
            mapper.text(': ');
            emitExpression(pair.value);

            if (index === named.pairs.length - 1) {
              mapper.text(' ');
            }

            start = rangeForNode(pair.value).end;
            mapper.text(', ');
          }

          mapper.text('...__glintDSL__.NamedArgsMarker }');
        });
      }
    }

    type PathKind = 'this' | 'arg' | 'free';

    function emitPath(node: AST.PathExpression): void {
      mapper.forNode(node, () => {
        let { start } = rangeForNode(node);
        emitPathContents(getPathParts(node), start, determinePathKind(node));
      });
    }

    function determinePathKind(node: AST.PathExpression): PathKind {
      switch (node.head.type) {
        case 'AtHead':
          return 'arg';
        case 'ThisHead':
          return 'this';
        case 'VarHead':
          return 'free';
      }
    }

    function emitPathContents(parts: string[], start: number, kind: PathKind): void {
      if (kind === 'this') {
        let thisStart = template.indexOf('this', start);
        mapper.text('__glintRef__.');
        mapper.identifier('this', thisStart);
        start = template.indexOf('.', thisStart) + 1;
      } else if (kind === 'arg') {
        mapper.text('__glintRef__.args');
        start = template.indexOf('@', start) + 1;
      }

      let head = parts[0];
      if (!head) return;

      start = template.indexOf(head, start);

      // The first segment of a non-this, non-arg path must resolve
      // to some in-scope identifier.
      if (kind === 'free') {
        emitIdentifierReference(head, start);
      } else {
        emitPropertyAccesss(head, { offset: start, optional: false });
      }

      start += head.length;

      for (let i = 1; i < parts.length; i++) {
        let part = parts[i];
        start = template.indexOf(part, start);
        emitPropertyAccesss(part, { offset: start, optional: true });
        start += part.length;
      }
    }

    type PropertyAccessOptions = {
      offset?: number;
      optional?: boolean;
      synthetic?: boolean;
    };

    function emitPropertyAccesss(
      name: string,
      { offset, optional, synthetic }: PropertyAccessOptions = {},
    ): void {
      // Synthetic accesses should always use `[]` notation to avoid incidentally triggering
      // `noPropertyAccessFromIndexSignature`. Emitting `{{foo.bar}}` property accesses, however,
      // should use `.` notation for exactly the same reason.
      if (!synthetic && isSafeKey(name)) {
        mapper.text(optional ? '?.' : '.');
        if (offset) {
          mapper.identifier(name, offset);
        } else {
          mapper.text(name);
        }
      } else {
        mapper.text(optional ? '?.[' : '[');
        if (offset) {
          emitIdentifierString(name, offset);
        } else {
          mapper.text(JSON.stringify(name));
        }
        mapper.text(']');
      }
    }

    function emitHashKey(name: string, start: number): void {
      if (isSafeKey(name)) {
        mapper.identifier(name, start);
      } else {
        emitIdentifierString(name, start);
      }
    }

    function emitIdentifierString(name: string, start: number): void {
      mapper.text('"');
      mapper.identifier(JSON.stringify(name).slice(1, -1), start, name.length);
      mapper.text('"');
    }

    function emitLiteral(node: AST.Literal): void {
      mapper.forNode(node, () =>
        mapper.text(node.value === undefined ? 'undefined' : JSON.stringify(node.value)),
      );
    }

    function isSafeKey(key: string): boolean {
      return /^[a-z_$][a-z0-9_$]*$/i.test(key);
    }
  });
}

const JSKeywords = new Set([
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'eval',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'undefined',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

function isJSKeyword(token: string): boolean {
  return JSKeywords.has(token);
}

function makeJSSafe(identifier: string): string {
  if (isJSKeyword(identifier) || identifier.startsWith('__')) {
    return `__${identifier}`;
  }

  return identifier;
}
