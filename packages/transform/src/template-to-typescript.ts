import { AST } from '@glimmer/syntax';
import { unreachable, assert } from './util';
import { mapTemplateContents, RewriteResult } from './map-template-contents';
import ScopeStack from './scope-stack';

const INLINE_KEYWORDS = ['if', 'yield', 'hash', 'array'] as const;
const BLOCK_KEYWORDS = ['if'] as const;

type InlineKeyword = typeof INLINE_KEYWORDS[number];
type BlockKeyword = typeof BLOCK_KEYWORDS[number];

export type TemplateToTypescriptOptions = {
  typesPath: string;
  identifiersInScope?: Array<string>;
  contextType?: string;
  typeParams?: string;
  preamble?: Array<string>;
};

/**
 * Given the text contents of a a template, returns a  TypeScript representation
 * of that template's contents, as well as a mapping of offsets and ranges between
 * the original and transformed contents.
 */
export function templateToTypescript(
  template: string,
  {
    typesPath,
    identifiersInScope = [],
    typeParams = '',
    contextType = 'unknown',
    preamble = [],
  }: TemplateToTypescriptOptions
): RewriteResult {
  return mapTemplateContents(template, (ast, { emit, rangeForNode }) => {
    let scope = new ScopeStack(identifiersInScope);

    emit.text('(() => {');
    emit.indent();
    emit.newline();

    for (let line of preamble) {
      emit.text(line);
      emit.newline();
    }

    emit.text(`let χ!: typeof import("${typesPath}");`);
    emit.newline();

    emit.text('return χ.template(function');
    emit.synthetic(typeParams);
    emit.text(`(𝚪: import("${typesPath}").ResolveContext<`);
    emit.synthetic(contextType);
    emit.text('>) {');
    emit.newline();
    emit.indent();

    for (let statement of ast.body) {
      emitTopLevelStatement(statement);
    }

    // Ensure the context variable is always consumed to prevent
    // an unused variable warning
    emit.text('𝚪;');
    emit.newline();

    emit.dedent();
    emit.text('});');
    emit.newline();

    emit.dedent();
    emit.text('})()');

    return;

    function emitTopLevelStatement(node: AST.TopLevelStatement): void {
      switch (node.type) {
        case 'Block':
        case 'PartialStatement':
          throw new Error(`Internal error: unexpected top-level ${node.type}`);

        case 'TextNode':
        case 'CommentStatement':
        case 'MustacheCommentStatement':
          // Nothing to be done
          return;

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

    function emitInlineKeywordStatement(
      keyword: InlineKeyword,
      node: AST.MustacheStatement | AST.SubExpression,
      position: InvokePosition
    ): void {
      switch (keyword) {
        case 'yield':
          return emitYieldStatement(node, position);

        case 'if':
          return emitIfExpression(node);

        case 'hash':
          return emitHashExpression(node);

        case 'array':
          return emitArrayExpression(node);

        default:
          unreachable(keyword);
      }
    }

    function emitHashExpression(node: AST.MustacheStatement | AST.SubExpression): void {
      emit.forNode(node, () => {
        assert(node.params.length === 0, '{{hash}} only accepts named parameters');

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

    function emitArrayExpression(node: AST.MustacheStatement | AST.SubExpression): void {
      emit.forNode(node, () => {
        assert(node.hash.pairs.length === 0, '{{array}} only accepts positional parameters');

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

    function emitIfExpression(node: AST.MustacheStatement | AST.SubExpression): void {
      emit.forNode(node, () => {
        assert(node.params.length >= 2, '{{if}} requires at least two parameters');

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

    function getInlineKeyword(
      node: AST.MustacheStatement | AST.SubExpression
    ): InlineKeyword | null {
      if (node.path.type === 'PathExpression' && node.path.parts.length === 1) {
        let name = node.path.parts[0] as InlineKeyword;
        if (INLINE_KEYWORDS.includes(name)) {
          return name;
        }
      }

      return null;
    }

    function getBlockKeyword(node: AST.BlockStatement): BlockKeyword | null {
      if (node.path.type === 'PathExpression' && node.path.parts.length === 1) {
        let name = node.path.parts[0] as BlockKeyword;
        if (BLOCK_KEYWORDS.includes(name)) {
          return name;
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
      emit.forNode(node, () => {
        for (let modifier of node.modifiers) {
          emitModifier(modifier);
        }

        for (let attr of node.attributes) {
          emitPlainAttribute(attr);
        }

        let firstCharacter = node.tag.charAt(0);
        if (firstCharacter.toUpperCase() === firstCharacter || node.tag.includes('.')) {
          emitComponent(node);
        } else {
          emitPlainElement(node);
        }
      });
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

    function emitIdentifierReference(name: string, hbsOffset: number, hbsLength?: number): void {
      if (scope.hasBinding(name)) {
        emit.identifier(name, hbsOffset, hbsLength);
      } else {
        emit.text('χ.Globals[');
        emit.identifier(JSON.stringify(name), hbsOffset, hbsLength ?? name.length);
        emit.text(']');
      }
    }

    function tagNameToPath(input: string): { kind: PathKind; path: string } {
      if (input.startsWith('@')) {
        return {
          kind: 'arg',
          path: input.slice(1),
        };
      } else if (input.startsWith('this.')) {
        return {
          kind: 'this',
          path: input.slice('this.'.length),
        };
      } else {
        return {
          kind: 'free',
          path: input,
        };
      }
    }

    function emitComponent(node: AST.ElementNode): void {
      emit.forNode(node, () => {
        let start = template.indexOf(node.tag, rangeForNode(node).start);
        let { kind, path } = tagNameToPath(node.tag);

        emit.text('χ.invokeBlock(χ.resolve(');
        emitPathContents(path.split('.'), start, kind);
        emit.text(')({');

        let dataAttrs = node.attributes.filter(({ name }) => name.startsWith('@'));
        for (let [index, attr] of dataAttrs.entries()) {
          if (index) {
            emit.text(', ');
          } else {
            emit.text(' ');
          }

          emit.forNode(attr, () => {
            start = template.indexOf(attr.name, start);
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

          if (index === dataAttrs.length - 1) {
            emit.text(' ');
          }
        }

        emit.text('}), {');

        if (node.selfClosing) {
          emit.text('});');
        } else {
          emit.newline();
          emit.indent();

          let blocks = determineBlockChildren(node);
          if (blocks.type === 'named') {
            for (let child of blocks.children) {
              let childStart = rangeForNode(child).start;
              let nameStart = template.indexOf(child.tag, childStart) + ':'.length;
              let blockParamsStart = template.indexOf('|', childStart);
              let name = child.tag.slice(1);
              emitBlockContents(
                name,
                nameStart,
                child.blockParams,
                blockParamsStart,
                child.children
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

          emit.dedent();
          emit.text('});');

          // Emit `ComponentName;` to represent the closing tag, so we have
          // an anchor for things like symbol renames.
          emit.newline();
          emitPathContents(
            path.split('.'),
            template.lastIndexOf(node.tag, rangeForNode(node).end),
            kind
          );
          emit.text(';');
        }

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

    type BlockChildren =
      | { type: 'named'; children: AST.ElementNode[] }
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
            // Filter out blank `TextNode`s, comments, etc
            (child): child is AST.ElementNode => child.type === 'ElementNode'
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
      for (let child of node.children) {
        emitTopLevelStatement(child);
      }
    }

    function emitPlainAttribute(node: AST.AttrNode): void {
      emit.forNode(node, () => {
        if (node.name.startsWith('@') || node.value.type === 'TextNode') return;

        if (node.value.type === 'MustacheStatement') {
          emitMustacheStatement(node.value, 'attr');
        } else {
          emitConcatStatement(node.value);
        }

        emit.text(';');
        emit.newline();
      });
    }

    function emitModifier(node: AST.ElementModifierStatement): void {
      emit.forNode(node, () => {
        emit.text('χ.invokeModifier(');
        emitResolve(node, 'resolve');
        emit.text(');');
        emit.newline();
      });
    }

    function emitMustacheStatement(node: AST.MustacheStatement, position: InvokePosition): void {
      let keyword = getInlineKeyword(node);
      if (keyword) {
        emitInlineKeywordStatement(keyword, node, position);
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
        let isEmit = position === 'top-level' || position === 'attr' || position === 'concat';

        if (!hasParams && position === 'arg') {
          emitExpression(node.path);
        } else if (isEmit) {
          emit.text('χ.invokeEmit(');
          emitResolve(node, hasParams ? 'resolve' : 'resolveOrReturn');
          emit.text(')');
        } else {
          emitResolve(node, hasParams ? 'resolve' : 'resolveOrReturn');
        }
      });
    }

    function emitYieldStatement(
      node: AST.MustacheStatement | AST.SubExpression,
      position: InvokePosition
    ): void {
      emit.forNode(node, () => {
        assert(position === 'top-level', '{{yield}} may only appear as a top-level statement');

        let to = 'default';
        let toPair = node.hash.pairs.find((pair) => pair.key === 'to');
        if (toPair) {
          assert(
            toPair.value.type === 'StringLiteral',
            'Named block {{yield}}s must have a literal block name'
          );
          to = toPair.value.value;
        }

        emit.text('χ.yieldToBlock(𝚪, ');
        emit.text(JSON.stringify(to));

        for (let param of node.params) {
          emit.text(', ');
          emitExpression(param);
        }

        emit.text(')');
      });
    }

    function emitBlockKeywordStatement(keyword: BlockKeyword, node: AST.BlockStatement): void {
      switch (keyword) {
        case 'if':
          emitIfStatement(node);
          break;

        default:
          unreachable(keyword);
      }
    }

    function emitIfStatement(node: AST.BlockStatement): void {
      emit.forNode(node, () => {
        assert(node.params.length === 1, '{{#if}} requires exactly one condition');

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

    function emitBlockStatement(node: AST.BlockStatement): void {
      let keyword = getBlockKeyword(node);
      if (keyword) {
        emitBlockKeywordStatement(keyword, node);
        return;
      }

      emit.forNode(node, () => {
        emit.text('χ.invokeBlock(');
        emitResolve(node, 'resolve');
        emit.text(', {');
        emit.newline();
        emit.indent();

        emitBlock('default', node.program);

        if (node.inverse) {
          emitBlock('inverse', node.inverse);
        }

        emit.dedent();
        emit.text('});');

        // TODO: emit something corresponding to `{{/foo}}` like we do
        // for angle bracket components, so that symbol renames propagate?
        // A little hairier (ha) for mustaches, since they
        if (node.path.type === 'PathExpression') {
          let start = template.lastIndexOf(node.path.original, rangeForNode(node).end);
          emit.newline();
          emitPathContents(node.path.parts, start, determinePathKind(node.path));
          emit.text(';');
        }
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

      if (nameOffset) {
        emitHashKey(name, nameOffset);
      } else {
        emit.text(isSafeKey(name) ? name : JSON.stringify(name));
      }

      emit.text('(');

      let start = blockParamsOffset;
      for (let [index, param] of blockParams.entries()) {
        if (index) emit.text(', ');

        start = template.indexOf(param, start);
        emit.identifier(param, start);
      }

      emit.text(') {');
      emit.newline();
      emit.indent();

      for (let statement of children) {
        emitTopLevelStatement(statement);
      }

      emit.dedent();
      emit.text('},');
      emit.newline();
      scope.pop();
    }

    function emitSubExpression(node: AST.SubExpression): void {
      let keyword = getInlineKeyword(node);
      if (keyword) {
        emitInlineKeywordStatement(keyword, node, 'sexpr');
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
      emit.text('χ.');
      emit.text(resolveType);
      emit.text('(');
      emitExpression(node.path);
      emit.text(')({');

      let { start } = rangeForNode(node.hash);
      for (let [index, pair] of node.hash.pairs.entries()) {
        if (index) {
          emit.text(', ');
        } else {
          emit.text(' ');
        }

        start = template.indexOf(pair.key, start);
        emitHashKey(pair.key, start);
        emit.text(': ');
        emitExpression(pair.value);

        if (index === node.hash.pairs.length - 1) {
          emit.text(' ');
        }
      }

      emit.text('}');

      for (let param of node.params) {
        emit.text(', ');
        emitExpression(param);
      }

      emit.text(')');
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
        if (parts.length) {
          emit.text('.');
        }
        start = template.indexOf('.', thisStart) + 1;
      } else if (kind === 'arg') {
        emit.text('𝚪.args.');
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
        emit.identifier(head, start);
      }

      start += head.length;

      for (let i = 1; i < parts.length; i++) {
        let part = parts[i];
        start = template.indexOf(part, start);
        emit.text('?.');
        if (isSafeKey(part)) {
          emit.identifier(part, start);
        } else {
          emit.text('[');
          emit.identifier(JSON.stringify(part), start, part.length);
          emit.text(']');
        }
        start += part.length;
      }
    }

    function emitHashKey(name: string, start: number): void {
      emit.identifier(isSafeKey(name) ? name : JSON.stringify(name), start, name.length);
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
