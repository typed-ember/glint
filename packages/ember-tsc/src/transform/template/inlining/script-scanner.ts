import { ImportedBindings, TemplateThisBinding } from './index.js';

/**
 * What the transform needs to know about the position of one embedded
 * template within its script.
 */
export type TemplateContext = {
  /** How `{{this}}` binds at this position; see {@link TemplateThisBinding}. */
  thisBinding: TemplateThisBinding;
  /**
   * Whether the template is the whole of an expression statement (the RFC 931
   * implicit `export default` form), as opposed to an operand: a variable
   * initializer, a call argument, an array element, and so on.
   */
  isExpressionStatement: boolean;
};

export type ScanResult = {
  imports: ImportedBindings;
  /** One entry per input template range, in the same order. */
  templates: Array<TemplateContext>;
};

type Token =
  | { kind: 'ident'; text: string; newlineBefore: boolean }
  | { kind: 'string'; text: string; value: string; newlineBefore: boolean }
  | { kind: 'number' | 'template' | 'regex' | 'embedded'; newlineBefore: boolean }
  | { kind: 'punct'; text: string; newlineBefore: boolean };

/**
 * The context introduced by each still-open `{`. `class-header` is the span
 * between the `class` keyword and its body's `{`; it holds the depth of any
 * type-argument brackets so a `{` inside `class A<T = {}>` is not mistaken
 * for the body.
 */
type Context =
  | { kind: 'other' | 'class-body' | 'static-block' }
  | { kind: 'class-header'; angleDepth: number };

// Keywords after which a `/` starts a regular expression and after which a
// template is an operand rather than the start of a new statement.
const EXPRESSION_KEYWORDS = new Set([
  'as',
  'await',
  'case',
  'default',
  'delete',
  'export',
  'extends',
  'implements',
  'in',
  'instanceof',
  'new',
  'of',
  'satisfies',
  'throw',
  'typeof',
  'void',
  'yield',
]);

// Keywords that directly precede a statement body.
const STATEMENT_KEYWORDS = new Set(['do', 'else']);

const PUNCTUATORS = [
  '>>>=',
  '...',
  '===',
  '!==',
  '**=',
  '<<=',
  '>>=',
  '>>>',
  '&&=',
  '||=',
  '??=',
  '=>',
  '==',
  '!=',
  '<=',
  '>=',
  '&&',
  '||',
  '??',
  '?.',
  '++',
  '--',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '&=',
  '|=',
  '^=',
  '**',
  '<<',
  '>>',
];

/**
 * Scans a .gts/.gjs script, treating each of the given `<template>` ranges as
 * a single opaque token, and reports the import bindings it declares along
 * with the syntactic context of every template.
 *
 * This is a tokenizer, not a parser: it tracks strings, comments, template
 * literals, regular expressions and bracket nesting so that it can tell
 * where class bodies, static blocks and statements begin, which is all the
 * template transform needs. See `rewriteModuleStandalone`.
 */
export function scanScript(
  contents: string,
  templateRanges: ReadonlyArray<{ start: number; end: number }>,
): ScanResult {
  let scanner = new Scanner(contents, templateRanges);
  scanner.run();
  return { imports: scanner.imports, templates: scanner.templates };
}

class Scanner {
  imports: ImportedBindings = {};
  templates: Array<TemplateContext> = [];

  private pos = 0;
  private previous: Token | undefined;
  private newlineBefore = false;
  private contexts: Array<Context> = [];
  private nextTemplate = 0;
  // Tokens of an import declaration currently being read, up to its
  // module specifier.
  private pendingImport: Array<Token> | undefined;

  constructor(
    private contents: string,
    private templateRanges: ReadonlyArray<{ start: number; end: number }>,
  ) {}

  run(): void {
    while (this.pos < this.contents.length) {
      this.step();
    }
  }

  // Consumes one token (or one run of whitespace / one comment).
  private step(): void {
    let { contents } = this;
    let template = this.templateRanges[this.nextTemplate];
    if (template && this.pos >= template.start) {
      this.templates.push({
        thisBinding: this.thisBindingHere(),
        isExpressionStatement: this.startsStatement(),
      });
      this.nextTemplate++;
      this.pos = Math.max(template.end, this.pos + 1);
      this.emit({ kind: 'embedded', newlineBefore: this.newlineBefore });
      return;
    }

    let ch = contents[this.pos];
    let next = contents[this.pos + 1];

    if (ch === '\n' || ch === '\r' || ch === '\u2028' || ch === '\u2029') {
      this.newlineBefore = true;
      this.pos++;
    } else if (/\s/.test(ch)) {
      this.pos++;
    } else if (ch === '/' && next === '/') {
      let end = contents.indexOf('\n', this.pos);
      this.pos = end === -1 ? contents.length : end;
    } else if (ch === '/' && next === '*') {
      let end = contents.indexOf('*/', this.pos + 2);
      let stop = end === -1 ? contents.length : end + 2;
      if (/[\n\r\u2028\u2029]/.test(contents.slice(this.pos, stop))) this.newlineBefore = true;
      this.pos = stop;
    } else if (ch === '"' || ch === "'") {
      this.readString(ch);
    } else if (ch === '`') {
      this.readTemplateLiteral();
    } else if (ch === '/' && this.regexAllowed()) {
      this.readRegex();
    } else if (isIdentifierStart(ch)) {
      this.readIdentifier();
    } else if (isDigit(ch) || (ch === '.' && isDigit(next))) {
      this.readNumber();
    } else {
      this.readPunctuator();
    }
  }

  private emit(token: Token): void {
    this.previous = token;
    this.newlineBefore = false;

    if (this.pendingImport) {
      let last = this.pendingImport[this.pendingImport.length - 1];
      let expectsSource = last === undefined || (last.kind === 'ident' && last.text === 'from');
      if (token.kind === 'string' && expectsSource) {
        // `import 'source'` / `... from 'source'`. Any other string is a
        // string-named binding: `import { "a-b" as ab } from 'source'`.
        this.recordImport(this.pendingImport, token.value);
        this.pendingImport = undefined;
      } else if (token.kind === 'punct' && (token.text === ';' || token.text === '=')) {
        // `import x = require(...)` / `import x = ns.y` are not import
        // declarations; a stray `;` means the statement never had a source.
        this.pendingImport = undefined;
      } else {
        this.pendingImport.push(token);
      }
    }
  }

  private readString(quote: string): void {
    let { contents } = this;
    let start = this.pos;
    let i = start + 1;
    let value = '';
    while (i < contents.length && contents[i] !== quote) {
      if (contents[i] === '\\') {
        value += contents[i + 1] ?? '';
        i += 2;
      } else {
        value += contents[i];
        i++;
      }
    }
    this.pos = Math.min(i + 1, contents.length);
    this.emit({
      kind: 'string',
      text: contents.slice(start, this.pos),
      value,
      newlineBefore: this.newlineBefore,
    });
  }

  private readTemplateLiteral(): void {
    let { contents } = this;
    let newlineBefore = this.newlineBefore;
    // Consumes from the opening backtick through the closing one, scanning
    // each `${ ... }` substitution with the regular tokenizer so the braces
    // inside it balance.
    let i = this.pos + 1;
    while (i < contents.length && contents[i] !== '`') {
      if (contents[i] === '\\') {
        i += 2;
      } else if (contents[i] === '$' && contents[i + 1] === '{') {
        this.pos = i + 2;
        this.readSubstitution();
        i = this.pos;
      } else {
        i++;
      }
    }
    this.pos = Math.min(i + 1, contents.length);
    this.emit({ kind: 'template', newlineBefore });
  }

  // Tokenizes one `${ ... }` substitution, stopping after its closing `}`.
  private readSubstitution(): void {
    let depth = this.contexts.length;
    this.contexts.push({ kind: 'other' });
    this.previous = undefined;
    while (this.pos < this.contents.length && this.contexts.length > depth) {
      this.step();
    }
  }

  private readRegex(): void {
    let { contents } = this;
    let i = this.pos + 1;
    let inClass = false;
    while (i < contents.length && contents[i] !== '\n') {
      let c = contents[i];
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) break;
      i++;
    }
    i++;
    while (i < contents.length && isIdentifierPart(contents[i])) i++;
    this.pos = Math.min(i, contents.length);
    this.emit({ kind: 'regex', newlineBefore: this.newlineBefore });
  }

  private regexAllowed(): boolean {
    let prev = this.previous;
    if (!prev) return true;
    switch (prev.kind) {
      case 'ident':
        return EXPRESSION_KEYWORDS.has(prev.text) || STATEMENT_KEYWORDS.has(prev.text);
      case 'punct':
        // After `)` or `]` a slash divides; after `}` it is far more likely
        // to start a regex at the beginning of a statement than to divide an
        // object literal.
        return prev.text !== ')' && prev.text !== ']';
      default:
        return false;
    }
  }

  private readIdentifier(): void {
    let { contents } = this;
    let start = this.pos;
    let i = start;
    while (i < contents.length && isIdentifierPart(contents[i])) i++;
    this.pos = i;
    let text = contents.slice(start, i);
    let afterDot =
      this.previous?.kind === 'punct' &&
      (this.previous.text === '.' || this.previous.text === '?.');
    let startsStatement = this.startsStatement();

    this.emit({ kind: 'ident', text, newlineBefore: this.newlineBefore });

    if (afterDot) return;

    let following = this.peekNonSpace();
    if (text === 'class' && !(following !== undefined && /[:,)}=.?]/.test(following))) {
      // A `class` keyword (not a `class:` object key or `.class` access). The
      // header context becomes the class body at its `{`.
      this.contexts.push({ kind: 'class-header', angleDepth: 0 });
    } else if (
      text === 'import' &&
      startsStatement &&
      !this.pendingImport &&
      following !== '(' &&
      following !== '.'
    ) {
      // An import declaration; its tokens are gathered up to the module
      // specifier string and interpreted in `recordImport`.
      this.pendingImport = [];
    }
  }

  private peekNonSpace(): string | undefined {
    let { contents } = this;
    let i = this.pos;
    while (i < contents.length && /\s/.test(contents[i])) i++;
    return contents[i];
  }

  private readNumber(): void {
    let { contents } = this;
    let i = this.pos;
    while (i < contents.length && (isIdentifierPart(contents[i]) || contents[i] === '.')) i++;
    this.pos = i;
    this.emit({ kind: 'number', newlineBefore: this.newlineBefore });
  }

  private readPunctuator(): void {
    let { contents } = this;
    let text = PUNCTUATORS.find((p) => contents.startsWith(p, this.pos)) ?? contents[this.pos];
    this.pos += text.length;
    let newlineBefore = this.newlineBefore;
    let top = this.contexts[this.contexts.length - 1];

    if (text === '{') {
      if (top?.kind === 'class-header' && top.angleDepth === 0) {
        this.contexts[this.contexts.length - 1] = { kind: 'class-body' };
      } else if (
        top?.kind === 'class-body' &&
        this.previous?.kind === 'ident' &&
        this.previous.text === 'static'
      ) {
        this.contexts.push({ kind: 'static-block' });
      } else {
        this.contexts.push({ kind: 'other' });
      }
    } else if (text === '}') {
      this.contexts.pop();
    } else if (text === '(' || text === '[') {
      this.contexts.push({ kind: 'other' });
    } else if (text === ')' || text === ']') {
      if (top?.kind === 'other') this.contexts.pop();
    } else if (top?.kind === 'class-header') {
      if (text === '<') top.angleDepth++;
      else if (text === '>') top.angleDepth = Math.max(0, top.angleDepth - 1);
      else if (text === '>>') top.angleDepth = Math.max(0, top.angleDepth - 2);
    }

    this.emit({ kind: 'punct', text, newlineBefore });
  }

  private thisBindingHere(): TemplateThisBinding {
    // Mirrors `templateThisBinding`, which walks up the TS AST and stops at
    // the first static block, heritage clause or class it meets.
    for (let i = this.contexts.length - 1; i >= 0; i--) {
      let context = this.contexts[i];
      switch (context.kind) {
        case 'static-block':
          return 'backing-class';
        case 'class-header':
          return 'context';
        case 'class-body':
          return 'lexical';
      }
    }
    return 'context';
  }

  // Whether a token at the current position begins a statement, accounting
  // for automatic semicolon insertion after a line break.
  private startsStatement(): boolean {
    let prev = this.previous;
    if (!prev) return true;
    let { newlineBefore } = this;
    switch (prev.kind) {
      case 'punct':
        if (prev.text === ';' || prev.text === '{' || prev.text === '}') return true;
        if (prev.text === ')') return true;
        if (prev.text === ']') return newlineBefore;
        return false;
      case 'ident':
        if (STATEMENT_KEYWORDS.has(prev.text)) return true;
        if (EXPRESSION_KEYWORDS.has(prev.text)) return false;
        return newlineBefore;
      default:
        return newlineBefore;
    }
  }

  private recordImport(tokens: Array<Token>, source: string): void {
    let i = 0;
    let at = (index: number): Token | undefined => tokens[index];
    let isIdent = (token: Token | undefined, text?: string): token is Token & { kind: 'ident' } =>
      token?.kind === 'ident' && (text === undefined || token.text === text);
    let isPunct = (token: Token | undefined, text: string): boolean =>
      token?.kind === 'punct' && token.text === text;
    let nameOf = (token: Token | undefined): string | undefined =>
      token?.kind === 'ident' ? token.text : token?.kind === 'string' ? token.value : undefined;

    // `import type X from` / `import type { X } from` — but `import type from`
    // is a default import named `type`.
    if (isIdent(at(i), 'type') && at(i + 1) && !isIdent(at(i + 1), 'from')) i++;

    if (isIdent(at(i)) && !isPunct(at(i + 1), '{') && !isIdent(at(i), 'from')) {
      this.imports[(at(i) as { text: string }).text] = {
        specifier: 'default',
        source,
        synthetic: false,
      };
      i++;
      if (isPunct(at(i), ',')) i++;
    }

    if (isPunct(at(i), '*')) {
      // Namespace imports carry no individual bindings.
      return;
    }

    if (isPunct(at(i), '{')) {
      i++;
      while (i < tokens.length && !isPunct(at(i), '}')) {
        let entry: Array<Token> = [];
        while (i < tokens.length && !isPunct(at(i), ',') && !isPunct(at(i), '}')) {
          entry.push(tokens[i]);
          i++;
        }
        if (isPunct(at(i), ',')) i++;

        let j = 0;
        // Inline `type` modifier: `{ type X }` / `{ type X as Y }`, but
        // `{ type }` and `{ type as t }` import a binding named `type`.
        if (isIdent(entry[j], 'type') && entry[j + 1] && !isIdent(entry[j + 1], 'as')) j++;
        let specifier = nameOf(entry[j]);
        if (specifier === undefined) continue;
        let name = isIdent(entry[j + 1], 'as') ? nameOf(entry[j + 2]) : specifier;
        if (name === undefined) continue;
        this.imports[name] = { specifier, source, synthetic: false };
      }
    }
  }
}

function isIdentifierStart(ch: string | undefined): boolean {
  return ch !== undefined && /[\p{ID_Start}$_\\]/u.test(ch);
}

function isIdentifierPart(ch: string | undefined): boolean {
  return ch !== undefined && /[\p{ID_Continue}$\\]/u.test(ch);
}

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9';
}
