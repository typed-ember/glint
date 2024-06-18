import { AST } from '@glimmer/syntax';
import { unreachable, assert } from '../util.js';
import { EmbeddingSyntax, mapTemplateContents, RewriteResult } from './map-template-contents.js';
import ScopeStack from './scope-stack.js';
import { GlintEmitMetadata, GlintSpecialForm } from '@glint/core/config-types';
import { TextContent } from './mapping-tree.js';

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
  }: TemplateToTypescriptOptions
): RewriteResult {
  let { prefix, suffix } = embeddingSyntax;
  let template = `${''.padEnd(prefix.length)}${originalTemplate}${''.padEnd(suffix.length)}`;

  return mapTemplateContents(originalTemplate, { embeddingSyntax }, (ast, mapper) => {
    let { emit, record, rangeForLine, rangeForNode } = mapper;
    let scope = new ScopeStack([]);

    emitTemplateBoilerplate(() => {
      for (let statement of ast?.body ?? []) {
        emitTopLevelStatement(statement);
      }
    });

    return;

    function emitTopLevelStatement(node: AST.TopLevelStatement): void {
      switch (node.type) {
        case 'Block':
        case 'PartialStatement':
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
        emit.text(meta.prepend);
      }

      if (useJsDoc) {
        emit.text(`(/** @type {typeof import("${typesModule}")} */ ({}))`);
      } else {
        emit.text(`({} as typeof import("${typesModule}"))`);
      }

      if (backingValue) {
        emit.text(`.templateForBackingValue(${backingValue}, function(𝚪`);
      } else {
        emit.text(`.templateExpression(function(𝚪`);
      }

      if (useJsDoc) {
        emit.text(`, /** @type {typeof import("${typesModule}")} */ χ) {`);
      } else {
        emit.text(`, χ: typeof import("${typesModule}")) {`);
      }

      emit.newline();
      emit.indent();

      for (let line of preamble) {
        emit.text(line);
        emit.newline();
      }

      if (ast) {
        emit.forNode(ast, emitBody);
      }

      // Ensure the context and lib variables are always consumed to prevent
      // an unused variable warning
      emit.text('𝚪; χ;');
      emit.newline();

      emit.dedent();
      emit.text('})');

      if (meta?.append) {
        emit.text(meta.append);
      }
    }

    function emitTopLevelTextNode(node: AST.TextNode): void {
      // We don't need to emit any code for text nodes, but we want to track
      // where they are so we know NOT to try and suggest global completions
      // in "text space" where it wouldn't make sense.
      emit.nothing(node, new TextContent());
    }

    function emitComment(node: AST.MustacheCommentStatement | AST.CommentStatement): void {
      let text = node.value.trim();
      let match = /^@glint-([a-z-]+)/i.exec(text);
      if (!match) {
        return emit.nothing(node);
      }

      let kind = match[1];
      let location = rangeForNode(node);
      if (kind === 'ignore') {
        record.directive(kind, location, rangeForLine(node.loc.end.line + 1));
      } else if (kind === 'expect-error') {
        record.directive(kind, location, rangeForLine(node.loc.end.line + 1));
      } else if (kind === 'nocheck') {
        record.directive('ignore', location, { start: 0, end: template.length - 1 });
      } else {
        record.error(`Unknown directive @glint-${kind}`, location);
      }

      emit.forNode(node, () => {
        emit.text(`// @glint-${kind}`);
        emit.newline();
      });
    }

    // Captures the context in which a given invocation (i.e. a mustache or
    // sexpr) is being performed. Certain keywords like `yield` are only
    // valid in certain positions, and whether a param-less mustache implicitly
    // evaluates a helper or returns it also depends on the location it's in.
    type InvokePosition = 'top-level' | 'attr' | 'arg' | 'concat' | 'sexpr';

    function emitTopLevelMustacheStatement(node: AST.MustacheStatement): void {
      emitMustacheStatement(node, 'top-level');
      emit.text(';');
      emit.newline();
    }

    function emitSpecialFormExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression,
      position: InvokePosition
    ): void {
      if (formInfo.requiresConsumption) {
        emit.text('(χ.noop(');
        emitExpression(node.path);
        emit.text('), ');
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
          record.error(`${formInfo.name} is not valid in inline form`, rangeForNode(node));
          emit.text('undefined');
      }

      if (formInfo.requiresConsumption) {
        emit.text(')');
      }
    }

    function emitBindInvokableExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression,
      position: InvokePosition
    ): void {
      emit.forNode(node, () => {
        assert(
          node.params.length >= 1,
          () => `{{${formInfo.name}}} requires at least one positional argument`
        );

        assert(
          node.params.length === 1 || node.hash.pairs.length === 0,
          () =>
            `Due to TypeScript inference limitations, {{${formInfo.name}}} can only pre-bind ` +
            `either named or positional arguments in a single pass. You can instead break the ` +
            `binding into two parts, e.g. ` +
            `{{${formInfo.name} (${formInfo.name} ... posA posB) namedA=true namedB=true}}`
        );

        if (position === 'top-level') {
          emit.text('χ.emitContent(');
        }

        // Treat the first argument to a bind-invokable expression (`{{component}}`,
        // `{{helper}}`, etc) as special: we wrap it in a `resolve` call so that the
        // type machinery for those helpers can always operate against the resolved value.
        // We wrap the `resolveForBind` call in an IIFE to prevent "backpressure" in
        // type inference from the subsequent arguments that are being passed: the bound
        // invokable is the source of record for its own type and we don't want inference
        // from the `resolveForBind` call to be affected by other (potentially incorrect)
        // parameter types.
        emit.text('χ.resolve(');
        emitExpression(node.path);
        emit.text(')((() => χ.resolveForBind(');
        emitExpression(node.params[0]);
        emit.text('))(), ');
        emitArgs(node.params.slice(1), node.hash);
        emit.text(')');

        if (position === 'top-level') {
          emit.text(')');
        }
      });
    }

    function emitObjectExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression
    ): void {
      emit.forNode(node, () => {
        assert(
          node.params.length === 0,
          () => `{{${formInfo.name}}} only accepts named parameters`
        );

        if (!node.hash.pairs.length) {
          emit.text('{}');
          return;
        }

        emit.text('({');
        emit.indent();
        emit.newline();

        let start = template.indexOf('hash', rangeForNode(node).start) + 4;
        for (let pair of node.hash.pairs) {
          start = template.indexOf(pair.key, start);
          emitHashKey(pair.key, start);
          emit.text(': ');
          emitExpression(pair.value);
          emit.text(',');
          emit.newline();
        }

        emit.dedent();
        emit.text('})');
      });
    }

    function emitArrayExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression
    ): void {
      emit.forNode(node, () => {
        assert(
          node.hash.pairs.length === 0,
          () => `{{${formInfo.name}}} only accepts positional parameters`
        );

        emit.text('[');

        for (let [index, param] of node.params.entries()) {
          emitExpression(param);

          if (index < node.params.length - 1) {
            emit.text(', ');
          }
        }

        emit.text(']');
      });
    }

    function emitIfExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression
    ): void {
      emit.forNode(node, () => {
        assert(
          node.params.length >= 2,
          () => `{{${formInfo.name}}} requires at least two parameters`
        );

        emit.text('(');
        emitExpression(node.params[0]);
        emit.text(') ? (');
        emitExpression(node.params[1]);
        emit.text(') : (');

        if (node.params[2]) {
          emitExpression(node.params[2]);
        } else {
          emit.text('undefined');
        }

        emit.text(')');
      });
    }

    function emitIfNotExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression
    ): void {
      emit.forNode(node, () => {
        assert(
          node.params.length >= 2,
          () => `{{${formInfo.name}}} requires at least two parameters`
        );

        emit.text('!(');
        emitExpression(node.params[0]);
        emit.text(') ? (');
        emitExpression(node.params[1]);
        emit.text(') : (');

        if (node.params[2]) {
          emitExpression(node.params[2]);
        } else {
          emit.text('undefined');
        }

        emit.text(')');
      });
    }

    function emitBinaryOperatorExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression
    ): void {
      emit.forNode(node, () => {
        assert(
          node.hash.pairs.length === 0,
          () => `{{${formInfo.name}}} only accepts positional parameters`
        );
        assert(
          node.params.length === 2,
          () => `{{${formInfo.name}}} requires exactly two parameters`
        );

        const [left, right] = node.params;

        emit.text('(');
        emitExpression(left);
        emit.text(` ${formInfo.form} `);
        emitExpression(right);
        emit.text(')');
      });
    }

    function emitLogicalExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression
    ): void {
      emit.forNode(node, () => {
        assert(
          node.hash.pairs.length === 0,
          () => `{{${formInfo.name}}} only accepts positional parameters`
        );
        assert(
          node.params.length >= 2,
          () => `{{${formInfo.name}}} requires at least two parameters`
        );

        emit.text('(');
        for (const [index, param] of node.params.entries()) {
          emitExpression(param);

          if (index < node.params.length - 1) {
            emit.text(` ${formInfo.form} `);
          }
        }
        emit.text(')');
      });
    }

    function emitUnaryOperatorExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression
    ): void {
      emit.forNode(node, () => {
        assert(
          node.hash.pairs.length === 0,
          () => `{{${formInfo.name}}} only accepts positional parameters`
        );
        assert(
          node.params.length === 1,
          () => `{{${formInfo.name}}} requires exactly one parameter`
        );

        const [param] = node.params;

        emit.text(formInfo.form);
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
      emit.forNode(node, () => {
        emit.text('`');
        for (let part of node.parts) {
          if (part.type === 'MustacheStatement') {
            emit.text('$' + '{');
            emitMustacheStatement(part, 'concat');
            emit.text('}');
          }
        }
        emit.text('`');
      });
    }

    function emitIdentifierReference(name: string, hbsOffset: number): void {
      if (treatAsGlobal(name)) {
        emit.text('χ.Globals["');
        emit.identifier(JSON.stringify(name).slice(1, -1), hbsOffset, name.length);
        emit.text('"]');
      } else {
        emit.identifier(makeJSSafe(name), hbsOffset, name.length);
      }
    }

    function treatAsGlobal(name: string): boolean {
      if (globals) {
        // If we have a known set of global identifiers, we should only treat
        // members of that set as global and assume everything else is local.
        // This is typically true in environments that capture scope, like
        // strict-mode Ember.
        return globals.includes(name);
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
      emit.forNode(node, () => {
        let { start, path, kind } = tagNameToPathContents(node);

        for (let comment of node.comments) {
          emitComment(comment);
        }

        emit.text('{');
        emit.newline();
        emit.indent();

        emit.text('const 𝛄 = χ.emitComponent(χ.resolve(');
        emitPathContents(path, start, kind);
        emit.text(')(');

        let dataAttrs = node.attributes.filter(({ name }) => name.startsWith('@'));
        if (dataAttrs.length) {
          emit.text('{ ');

          for (let attr of dataAttrs) {
            emit.forNode(attr, () => {
              start = template.indexOf(attr.name, start + 1);
              emitHashKey(attr.name.slice(1), start + 1);
              emit.text(': ');

              switch (attr.value.type) {
                case 'TextNode':
                  emit.text(JSON.stringify(attr.value.chars));
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
            emit.text(', ');
          }

          emit.text('...χ.NamedArgsMarker }');
        }

        emit.text('));');
        emit.newline();

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

              emit.forNode(child, () =>
                emitBlockContents(
                  name,
                  nameStart,
                  child.blockParams,
                  blockParamsStart,
                  child.children
                )
              );
            }
          } else {
            let blockParamsStart = template.indexOf('|', rangeForNode(node).start);
            emitBlockContents(
              'default',
              undefined,
              node.blockParams,
              blockParamsStart,
              blocks.children
            );
          }

          // Emit `ComponentName;` to represent the closing tag, so we have
          // an anchor for things like symbol renames.
          emitPathContents(path, template.lastIndexOf(node.tag, rangeForNode(node).end), kind);
          emit.text(';');
          emit.newline();
        }

        emit.dedent();
        emit.text('}');
        emit.newline();
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
            (child): child is NamedBlockChild =>
              child.type === 'ElementNode' ||
              child.type === 'CommentStatement' ||
              child.type === 'MustacheCommentStatement'
          ),
        };
      } else {
        // If we get here, meaningful content was mixed with named blocks,
        // so it's worth doing the additional work to produce errors for
        // those nodes
        for (let child of node.children) {
          if (!isNamedBlock(child)) {
            emit.forNode(child, () =>
              assert(
                isAllowedAmongNamedBlocks(child),
                'Named blocks may not be mixed with other content'
              )
            );
          }
        }

        return { type: 'named', children: [] };
      }
    }

    function emitPlainElement(node: AST.ElementNode): void {
      emit.forNode(node, () => {
        for (let comment of node.comments) {
          emitComment(comment);
        }

        emit.text('{');
        emit.newline();
        emit.indent();

        emit.text('const 𝛄 = χ.emitElement(');
        emit.text(JSON.stringify(node.tag));
        emit.text(');');
        emit.newline();

        emitAttributesAndModifiers(node);

        for (let child of node.children) {
          emitTopLevelStatement(child);
        }

        emit.dedent();
        emit.text('}');
        emit.newline();
      });
    }

    function emitAttributesAndModifiers(node: AST.ElementNode): void {
      let nonArgAttributes = node.attributes.filter((attr) => !attr.name.startsWith('@'));
      if (!nonArgAttributes.length && !node.modifiers.length) {
        // Avoid unused-symbol diagnostics
        emit.text('𝛄;');
        emit.newline();
      } else {
        emitSplattributes(node);
        emitPlainAttributes(node);
        emitModifiers(node);
      }
    }

    function emitPlainAttributes(node: AST.ElementNode): void {
      let attributes = node.attributes.filter(
        (attr) => !attr.name.startsWith('@') && attr.name !== SPLATTRIBUTES
      );

      if (!attributes.length) return;

      emit.text('χ.applyAttributes(𝛄.element, {');
      emit.newline();
      emit.indent();

      let start = template.indexOf(node.tag, rangeForNode(node).start) + node.tag.length;

      for (let attr of attributes) {
        emit.forNode(attr, () => {
          start = template.indexOf(attr.name, start + 1);

          emitHashKey(attr.name, start);
          emit.text(': ');

          if (attr.value.type === 'MustacheStatement') {
            emitMustacheStatement(attr.value, 'attr');
          } else if (attr.value.type === 'ConcatStatement') {
            emitConcatStatement(attr.value);
          } else {
            emit.text(JSON.stringify(attr.value.chars));
          }

          emit.text(',');
          emit.newline();
        });
      }

      emit.dedent();
      emit.text('});');
      emit.newline();
    }

    function emitSplattributes(node: AST.ElementNode): void {
      let splattributes = node.attributes.find((attr) => attr.name === SPLATTRIBUTES);
      if (!splattributes) return;

      assert(
        splattributes.value.type === 'TextNode' && splattributes.value.chars === '',
        '`...attributes` cannot accept a value'
      );

      emit.forNode(splattributes, () => {
        emit.text('χ.applySplattributes(𝚪.element, 𝛄.element);');
      });

      emit.newline();
    }

    function emitModifiers(node: AST.ElementNode): void {
      for (let modifier of node.modifiers) {
        emit.forNode(modifier, () => {
          emit.text('χ.applyModifier(χ.resolve(');
          emitExpression(modifier.path);
          emit.text(')(𝛄.element, ');
          emitArgs(modifier.params, modifier.hash);
          emit.text('));');
          emit.newline();
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
          'Literals do not accept params'
        );

        emitLiteral(node.path);
        return;
      }

      emit.forNode(node, () => {
        // If a mustache has parameters, we know it must be an invocation; if
        // not, it depends on where it appears. In arg position, it's always
        // passed directly as a value; otherwise it's invoked if it's a
        // component/helper, and returned as a value otherwise.
        let hasParams = Boolean(node.hash.pairs.length || node.params.length);
        if (!hasParams && position === 'arg' && !isGlobal(node.path)) {
          emitExpression(node.path);
        } else if (position === 'top-level') {
          emit.text('χ.emitContent(');
          emitResolve(node, hasParams ? 'resolve' : 'resolveOrReturn');
          emit.text(')');
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
          !scope.hasBinding(path.head.name)
      );
    }

    function emitYieldExpression(
      formInfo: SpecialFormInfo,
      node: AST.MustacheStatement | AST.SubExpression,
      position: InvokePosition
    ): void {
      emit.forNode(node, () => {
        assert(
          position === 'top-level',
          () => `{{${formInfo.name}}} may only appear as a top-level statement`
        );

        let to = 'default';
        let toPair = node.hash.pairs.find((pair) => pair.key === 'to');
        if (toPair) {
          assert(
            toPair.value.type === 'StringLiteral',
            () => `Named block {{${formInfo.name}}}s must have a literal block name`
          );
          to = toPair.value.value;
        }

        if (to === 'inverse') {
          to = 'else';
        }

        emit.text('χ.yieldToBlock(𝚪, ');
        emit.text(JSON.stringify(to));
        emit.text(')(');

        for (let [index, param] of node.params.entries()) {
          if (index) {
            emit.text(', ');
          }

          emitExpression(param);
        }

        emit.text(')');
      });
    }

    function emitSpecialFormStatement(formInfo: SpecialFormInfo, node: AST.BlockStatement): void {
      if (formInfo.requiresConsumption) {
        emitExpression(node.path);
        emit.text(';');
        emit.newline();
      }

      switch (formInfo.form) {
        case 'if':
          emitIfStatement(formInfo, node);
          break;

        case 'if-not':
          emitUnlessStatement(formInfo, node);
          break;

        case 'bind-invokable':
          record.error(
            `The {{${formInfo.name}}} helper can't be used directly in block form under Glint. ` +
              `Consider first binding the result to a variable, e.g. '{{#let (${formInfo.name} ...) as |...|}}' ` +
              `and then using the bound value.`,
            rangeForNode(node.path)
          );
          break;

        default:
          record.error(`${formInfo.name} is not valid in block form`, rangeForNode(node.path));
      }
    }

    function emitIfStatement(formInfo: SpecialFormInfo, node: AST.BlockStatement): void {
      emit.forNode(node, () => {
        assert(
          node.params.length === 1,
          () => `{{#${formInfo.name}}} requires exactly one condition`
        );

        emit.text('if (');
        emitExpression(node.params[0]);
        emit.text(') {');
        emit.newline();
        emit.indent();

        for (let statement of node.program.body) {
          emitTopLevelStatement(statement);
        }

        if (node.inverse) {
          emit.dedent();
          emit.text('} else {');
          emit.indent();
          emit.newline();

          for (let statement of node.inverse.body) {
            emitTopLevelStatement(statement);
          }
        }

        emit.dedent();
        emit.text('}');
        emit.newline();
      });
    }

    function emitUnlessStatement(formInfo: SpecialFormInfo, node: AST.BlockStatement): void {
      emit.forNode(node, () => {
        assert(
          node.params.length === 1,
          () => `{{#${formInfo.name}}} requires exactly one condition`
        );

        emit.text('if (!(');
        emitExpression(node.params[0]);
        emit.text(')) {');
        emit.newline();
        emit.indent();

        for (let statement of node.program.body) {
          emitTopLevelStatement(statement);
        }

        if (node.inverse) {
          emit.dedent();
          emit.text('} else {');
          emit.indent();
          emit.newline();

          for (let statement of node.inverse.body) {
            emitTopLevelStatement(statement);
          }
        }

        emit.dedent();
        emit.text('}');
        emit.newline();
      });
    }

    function emitBlockStatement(node: AST.BlockStatement): void {
      let specialFormInfo = checkSpecialForm(node);
      if (specialFormInfo) {
        emitSpecialFormStatement(specialFormInfo, node);
        return;
      }

      emit.forNode(node, () => {
        emit.text('{');
        emit.newline();
        emit.indent();

        emit.text('const 𝛄 = χ.emitComponent(');
        emitResolve(node, 'resolve');
        emit.text(');');
        emit.newline();

        emitBlock('default', node.program);

        if (node.inverse) {
          emitBlock('else', node.inverse);
        }

        // TODO: emit something corresponding to `{{/foo}}` like we do
        // for angle bracket components, so that symbol renames propagate?
        // A little hairier (ha) for mustaches, since they
        if (node.path.type === 'PathExpression') {
          let start = template.lastIndexOf(node.path.original, rangeForNode(node).end);
          emitPathContents(node.path.parts, start, determinePathKind(node.path));
          emit.text(';');
          emit.newline();
        }

        emit.dedent();
        emit.text('}');
      });

      emit.newline();
    }

    function emitBlock(name: string, node: AST.Block): void {
      let paramsStart = template.lastIndexOf(
        '|',
        template.lastIndexOf('|', rangeForNode(node).start) - 1
      );

      emitBlockContents(name, undefined, node.blockParams, paramsStart, node.body);
    }

    function emitBlockContents(
      name: string,
      nameOffset: number | undefined,
      blockParams: string[],
      blockParamsOffset: number,
      children: AST.TopLevelStatement[]
    ): void {
      assert(
        blockParams.every((name) => !name.includes('-')),
        'Block params must be valid TypeScript identifiers'
      );

      scope.push(blockParams);

      emit.text('{');
      emit.newline();
      emit.indent();

      emit.text('const [');

      let start = blockParamsOffset;
      for (let [index, param] of blockParams.entries()) {
        if (index) emit.text(', ');

        start = template.indexOf(param, start);
        emit.identifier(makeJSSafe(param), start, param.length);
      }

      emit.text('] = 𝛄.blockParams');
      emitPropertyAccesss(name, { offset: nameOffset, synthetic: true });
      emit.text(';');
      emit.newline();

      for (let statement of children) {
        emitTopLevelStatement(statement);
      }

      emit.dedent();
      emit.text('}');
      emit.newline();
      scope.pop();
    }

    function emitSubExpression(node: AST.SubExpression): void {
      let specialFormInfo = checkSpecialForm(node);
      if (specialFormInfo) {
        emitSpecialFormExpression(specialFormInfo, node, 'sexpr');
        return;
      }

      emit.forNode(node, () => {
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
      // e.g. "χ.resolveOrReturn(expectsAtLeastOneArg)()", which is required because
      // this is where TS might generate a diagnostic error.
      emit.forNode(node, () => {
        emit.text('χ.');
        emit.text(resolveType);
        emit.text('(');
        emitExpression(node.path);
        emit.text(')(');
        emitArgs(node.params, node.hash);
        emit.text(')');
      });
    }

    function emitArgs(positional: Array<AST.Expression>, named: AST.Hash): void {
      // Emit positional args
      for (let [index, param] of positional.entries()) {
        if (index) {
          emit.text(', ');
        }

        emitExpression(param);
      }

      // Emit named args
      if (named.pairs.length) {
        if (positional.length) {
          emit.text(', ');
        }

        // TS diagnostic error boundary
        emit.forNode(named, () => {
          emit.text('{ ');

          let { start } = rangeForNode(named);
          for (let [index, pair] of named.pairs.entries()) {
            start = template.indexOf(pair.key, start);
            emitHashKey(pair.key, start);
            emit.text(': ');
            emitExpression(pair.value);

            if (index === named.pairs.length - 1) {
              emit.text(' ');
            }

            start = rangeForNode(pair.value).end;
            emit.text(', ');
          }

          emit.text('...χ.NamedArgsMarker }');
        });
      }
    }

    type PathKind = 'this' | 'arg' | 'free';

    function emitPath(node: AST.PathExpression): void {
      emit.forNode(node, () => {
        let { start } = rangeForNode(node);
        emitPathContents(node.parts, start, determinePathKind(node));
      });
    }

    function determinePathKind(node: AST.PathExpression): PathKind {
      return node.this ? 'this' : node.data ? 'arg' : 'free';
    }

    function emitPathContents(parts: string[], start: number, kind: PathKind): void {
      if (kind === 'this') {
        let thisStart = template.indexOf('this', start);
        emit.text('𝚪.');
        emit.identifier('this', thisStart);
        start = template.indexOf('.', thisStart) + 1;
      } else if (kind === 'arg') {
        emit.text('𝚪.args');
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
      { offset, optional, synthetic }: PropertyAccessOptions = {}
    ): void {
      // Synthetic accesses should always use `[]` notation to avoid incidentally triggering
      // `noPropertyAccessFromIndexSignature`. Emitting `{{foo.bar}}` property accesses, however,
      // should use `.` notation for exactly the same reason.
      if (!synthetic && isSafeKey(name)) {
        emit.text(optional ? '?.' : '.');
        if (offset) {
          emit.identifier(name, offset);
        } else {
          emit.text(name);
        }
      } else {
        emit.text(optional ? '?.[' : '[');
        if (offset) {
          emitIdentifierString(name, offset);
        } else {
          emit.text(JSON.stringify(name));
        }
        emit.text(']');
      }
    }

    function emitHashKey(name: string, start: number): void {
      if (isSafeKey(name)) {
        emit.identifier(name, start);
      } else {
        emitIdentifierString(name, start);
      }
    }

    function emitIdentifierString(name: string, start: number): void {
      emit.text('"');
      emit.identifier(JSON.stringify(name).slice(1, -1), start, name.length);
      emit.text('"');
    }

    function emitLiteral(node: AST.Literal): void {
      emit.forNode(node, () =>
        emit.text(node.value === undefined ? 'undefined' : JSON.stringify(node.value))
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
