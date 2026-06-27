import { GlintEnvironment } from '@glint/ember-tsc/config/index';
import { rewriteModule } from '@glint/ember-tsc/transform/index';
import { stripIndent } from 'common-tags';
import ts from 'typescript';
import { describe, expect, test } from 'vitest';

describe('Transform: rewriteModule', () => {
  describe('inline tagged template', () => {
    const env = GlintEnvironment.load({});

    test('with a simple class', () => {
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class MyComponent extends Component {
            <template></template>
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, env);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent extends Component {
          static { ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {
        __glintRef__; __glintDSL__;
        }) }
        }"
      `);
    });

    test('handles the $ character', () => {
      let script = {
        filename: 'test.gts',
        contents: '<template>${{dollarAmount}}</template>;',
      };

      let transformedModule = rewriteModule(ts, { script }, env);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "export default ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(dollarAmount)());
        __glintRef__; __glintDSL__;
        });"
      `);
    });

    test('handles the ` character', () => {
      let script = {
        filename: 'test.gts',
        contents: '<template>`code`</template>;',
      };

      let transformedModule = rewriteModule(ts, { script }, env);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "export default ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {
        __glintRef__; __glintDSL__;
        });"
      `);
    });

    test('source-map offsets are stable after a ` character earlier in the template', () => {
      // Regression test: the .gts preprocessor escapes backticks inside
      // template content so the wrapped chunk parses as a valid JS template
      // literal. Previously the transform used `node.template.rawText`, which
      // preserves those backslash-escapes verbatim and inflated the template
      // length by 1 per escape — shifting every downstream source-map offset
      // by the same amount. The visible symptom was cmd-hover / go-to-def
      // underlines landing past the start of identifiers (most noticeable
      // for hyphenated keywords like `in-element`) when a backtick appeared
      // earlier in the same template (e.g. inside a `{{! ... }}` comment).
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class MyComponent extends Component<{ Args: { dest: Element } }> {
            <template>
              {{! Renders into \`dest\`. }}
              {{#in-element @dest}}hello{{/in-element}}
            </template>
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, env);

      expect(transformedModule?.errors).toEqual([]);

      // The transform emits `in_element` (identifier-safe) for the hyphenated
      // `in-element` keyword. Map that identifier back to the original .gts
      // and confirm it lands exactly on `in-element` rather than +N chars past.
      let transformed = transformedModule!.transformedContents;
      let transformedStart = transformed.indexOf('Globals.in_element');
      expect(transformedStart).toBeGreaterThan(-1);
      let identifierStart = transformedStart + 'Globals.'.length;
      let identifierEnd = identifierStart + 'in_element'.length;

      let originalRange = transformedModule!.getOriginalRange(identifierStart, identifierEnd);
      let originalStart = script.contents.indexOf('in-element');

      expect(originalRange.start).toBe(originalStart);
      expect(
        script.contents.slice(originalRange.start, originalRange.start + 'in-element'.length),
      ).toBe('in-element');
    });

    test('with a class with type parameters', () => {
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class MyComponent<K extends string> extends Component<{ value: K }> {
            <template></template>
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, env);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent<K extends string> extends Component<{ value: K }> {
          static { ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {
        __glintRef__; __glintDSL__;
        }) }
        }"
      `);
    });

    test('with an anonymous class', () => {
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class extends Component {
            <template></template>
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, env);

      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class extends Component {
          static { ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {
        __glintRef__; __glintDSL__;
        }) }
        }"
      `);
    });

    test('with a syntax error', () => {
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class MyComponent extends Component {
            <template>
              {{hello
            </template>
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, env);

      expect(transformedModule?.errors.length).toBe(1);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent extends Component {
          static { ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {
        __glintRef__; __glintDSL__;
        }) }
        }"
      `);
    });

    test('with a content-tag parse error, blanks transformed contents so TS sees an empty file', () => {
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class MyComponent extends Component {
            <template>
              <div></div>
            </template
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, env);

      // Exactly one error — the content-tag parse failure — is reported on the
      // transformed module. The Volar `g-compiler-errors` language service
      // plugin reads from this array to surface the error as a diagnostic.
      expect(transformedModule?.errors.length).toBe(1);
      expect(transformedModule?.errors[0]?.isContentTagError).toBe(true);

      // The transformed source is whitespace-only (preserving line structure)
      // so TypeScript will treat it as an empty file rather than producing a
      // cascade of misleading errors against the still-unparsed `<template>` tags.
      const transformed = transformedModule?.transformedContents ?? '';
      expect(transformed.length).toBeGreaterThan(0);
      expect(/\S/.test(transformed)).toBe(false);
      expect(transformed.split('\n').length).toBe(script.contents.split('\n').length);
    });
  });

  describe({}, () => {
    test('in class extends', () => {
      let customEnv = GlintEnvironment.load({});
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          import Component from 'special/component';
          export default class MyComponent extends Component(<template></template>) {

          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, customEnv);

      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from 'special/component';
        export default class MyComponent extends Component(({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {
        __glintRef__; __glintDSL__;
        })) {

        }"
      `);
    });

    test('embedded gts templates', () => {
      let customEnv = GlintEnvironment.load({});
      let script = {
        filename: 'foo.gts',
        contents: stripIndent`
          class MyComponent {
            <template>
              Hello, {{this.target}}!
            </template>

            private target = 'World';
          }
        `,
      };

      let rewritten = rewriteModule(ts, { script }, customEnv);

      expect(rewritten?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: TemplateEmbedding
        |  hbs(22:74):   <template>\\n    Hello, {{this.target}}!\\n  </template>
        |  ts(22:319):   static { ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.target)());\\n__glintRef__; __glintDSL__;\\n}) }
        |
        | | Mapping: Template
        | |  hbs(32:63):   Hello, {{this.target}}!
        | |  ts(52:83):    "@glint/ember-tsc/-private/dsl"
        | |
        | | Mapping: Template
        | |  hbs(32:63):   Hello, {{this.target}}!
        | |  ts(203:287):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.target)());
        | |
        | | | Mapping: TextContent
        | | |  hbs(37:43):   Hello,
        | | |  ts(203:203):
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(44:59):   {{this.target}}
        | | |  ts(203:285):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.target)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(44:59):   {{this.target}}
        | | | |  ts(228:284):  __glintDSL__.resolveOrReturn(__glintRef__.this.target)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(46:57):   this.target
        | | | | |  ts(228:282):  __glintDSL__.resolveOrReturn(__glintRef__.this.target)
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(46:57):   this.target
        | | | | | |  ts(257:281):  __glintRef__.this.target
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(46:50):   this
        | | | | | | |  ts(270:274):  this
        | | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(51:57):   target
        | | | | | | |  ts(275:281):  target
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  hbs(59:60):   !
        | | |  ts(287:287):
        | | |
        | |
        |"
      `);
    });

    test('implicit default export', () => {
      let customEnv = GlintEnvironment.load({});
      let script = {
        filename: 'foo.gts',
        contents: stripIndent`
          <template>
            Hello, {{@target}}!
          </template>
        `,
      };

      expect(rewriteModule(ts, { script }, customEnv)?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: TemplateEmbedding
        |  hbs(0:44):    <template>\\n  Hello, {{@target}}!\\n</template>
        |  ts(0:290):    export default ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.target)());\\n__glintRef__; __glintDSL__;\\n})
        |
        | | Mapping: Template
        | |  hbs(10:33):   Hello, {{@target}}!
        | |  ts(36:67):    "@glint/ember-tsc/-private/dsl"
        | |
        | | Mapping: Template
        | |  hbs(10:33):   Hello, {{@target}}!
        | |  ts(176:260):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.target)());
        | |
        | | | Mapping: TextContent
        | | |  hbs(13:19):   Hello,
        | | |  ts(176:176):
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(20:31):   {{@target}}
        | | |  ts(176:258):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.target)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(20:31):   {{@target}}
        | | | |  ts(201:257):  __glintDSL__.resolveOrReturn(__glintRef__.args.target)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(22:29):   @target
        | | | | |  ts(201:255):  __glintDSL__.resolveOrReturn(__glintRef__.args.target)
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(22:29):   @target
        | | | | | |  ts(230:254):  __glintRef__.args.target
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(23:29):   target
        | | | | | | |  ts(248:254):  target
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  hbs(31:32):   !
        | | |  ts(260:260):
        | | |
        | |
        |"
      `);
    });

    test('mixed expression and class uses', () => {
      let customEnv = GlintEnvironment.load({});
      let script = {
        filename: 'foo.gts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          console.log(<template>{{@message}}</template>);
          export class MyComponent extends Component {
            <template>{{this.title}}</template>
          }
        `,
      };

      let rewritten = rewriteModule(ts, { script }, customEnv);

      expect(rewritten?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: TemplateEmbedding
        |  hbs(56:89):   <template>{{@message}}</template>
        |  ts(56:332):   ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.message)());\\n__glintRef__; __glintDSL__;\\n})
        |
        | | Mapping: Template
        | |  hbs(66:78):   {{@message}}
        | |  ts(77:108):   "@glint/ember-tsc/-private/dsl"
        | |
        | | Mapping: Template
        | |  hbs(66:78):   {{@message}}
        | |  ts(217:302):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.message)());
        | |
        | | | Mapping: MustacheStatement
        | | |  hbs(66:78):   {{@message}}
        | | |  ts(217:300):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.message)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(66:78):   {{@message}}
        | | | |  ts(242:299):  __glintDSL__.resolveOrReturn(__glintRef__.args.message)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(68:76):   @message
        | | | | |  ts(242:297):  __glintDSL__.resolveOrReturn(__glintRef__.args.message)
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(68:76):   @message
        | | | | | |  ts(271:296):  __glintRef__.args.message
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(69:76):   message
        | | | | | | |  ts(289:296):  message
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | |
        | |
        |

        | Mapping: TemplateEmbedding
        |  hbs(139:174): <template>{{this.title}}</template>
        |  ts(382:678):  static { ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.title)());\\n__glintRef__; __glintDSL__;\\n}) }
        |
        | | Mapping: Template
        | |  hbs(149:163): {{this.title}}
        | |  ts(412:443):  "@glint/ember-tsc/-private/dsl"
        | |
        | | Mapping: Template
        | |  hbs(149:163): {{this.title}}
        | |  ts(563:646):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.title)());
        | |
        | | | Mapping: MustacheStatement
        | | |  hbs(149:163): {{this.title}}
        | | |  ts(563:644):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.title)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(149:163): {{this.title}}
        | | | |  ts(588:643):  __glintDSL__.resolveOrReturn(__glintRef__.this.title)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(151:161): this.title
        | | | | |  ts(588:641):  __glintDSL__.resolveOrReturn(__glintRef__.this.title)
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(151:161): this.title
        | | | | | |  ts(617:640):  __glintRef__.this.title
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(151:155): this
        | | | | | | |  ts(630:634):  this
        | | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(156:161): title
        | | | | | | |  ts(635:640):  title
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | |
        | |
        |"
      `);
    });

    test('with imported special forms', () => {
      let env = GlintEnvironment.load({});
      let script = {
        filename: 'foo.gts',
        contents: stripIndent`
          import { array as arr, hash as h } from '@ember/helper';

          <template>
            {{! Intentionally shadowing }}
            {{#let (arr 1 2) (h red="blue") as |arr h|}}
              Array is {{arr}}
              Hash is {{h}}
            {{/let}}
          </template>
        `,
      };

      expect(rewriteModule(ts, { script }, env)?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: TemplateEmbedding
        |  hbs(58:210):  <template>\\n  {{! Intentionally shadowing }}\\n  {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}\\n</template>
        |  ts(58:647):   export default ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {\\n{\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals.let)((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n}))));\\n{\\nconst [arr, h] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());\\n}\\n__glintDSL__.Globals.let;\\n}\\n__glintRef__; __glintDSL__;\\n})
        |
        | | Mapping: Template
        | |  hbs(68:199):  {{! Intentionally shadowing }}\\n  {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | |  ts(94:125):   "@glint/ember-tsc/-private/dsl"
        | |
        | | Mapping: Template
        | |  hbs(68:199):  {{! Intentionally shadowing }}\\n  {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | |  ts(234:617):  {\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals.let)((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n}))));\\n{\\nconst [arr, h] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());\\n}\\n__glintDSL__.Globals.let;\\n}
        | |
        | | | Mapping: TextContent
        | | |  hbs(68:69):
        | | |  ts(234:234):
        | | |
        | | | Mapping: MustacheCommentStatement
        | | |  hbs(71:101):  {{! Intentionally shadowing }}
        | | |  ts(234:234):
        | | |
        | | | Mapping: BlockStatement
        | | |  hbs(104:198): {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | | |  ts(234:616):  {\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals.let)((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n}))));\\n{\\nconst [arr, h] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());\\n}\\n__glintDSL__.Globals.let;\\n}
        | | |
        | | | | Mapping: BlockStatement
        | | | |  hbs(104:198): {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | | | |  ts(282:406):  __glintDSL__.resolve(__glintDSL__.Globals.let)((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n})))
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(107:110): let
        | | | | |  ts(303:327):  __glintDSL__.Globals.let
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(107:110): let
        | | | | | |  ts(324:327):  let
        | | | | | |
        | | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(112:115): arr
        | | | | |  ts(348:351):  arr
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(112:115): arr
        | | | | | |  ts(348:351):  arr
        | | | | | |
        | | | | |
        | | | | | Mapping: SubExpression
        | | | | |  hbs(111:120): (arr 1 2)
        | | | | |  ts(354:360):  [1, 2]
        | | | | |
        | | | | | | Mapping: NumberLiteral
        | | | | | |  hbs(116:117): 1
        | | | | | |  ts(355:356):  1
        | | | | | |
        | | | | | | Mapping: NumberLiteral
        | | | | | |  hbs(118:119): 2
        | | | | | |  ts(358:359):  2
        | | | | | |
        | | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(122:123): h
        | | | | |  ts(382:383):  h
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(122:123): h
        | | | | | |  ts(382:383):  h
        | | | | | |
        | | | | |
        | | | | | Mapping: SubExpression
        | | | | |  hbs(121:135): (h red="blue")
        | | | | |  ts(386:404):  ({\\nred: "blue",\\n})
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(124:127): red
        | | | | | |  ts(389:392):  red
        | | | | | |
        | | | | | | Mapping: StringLiteral
        | | | | | |  hbs(128:134): "blue"
        | | | | | |  ts(394:400):  "blue"
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(140:143): arr
        | | | |  ts(418:421):  arr
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(144:145): h
        | | | |  ts(423:424):  h
        | | | |
        | | | | Mapping: TextContent
        | | | |  hbs(153:161): Array is
        | | | |  ts(463:463):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(162:169): {{arr}}
        | | | |  ts(463:524):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)())
        | | | |
        | | | | | Mapping: MustacheStatement
        | | | | |  hbs(162:169): {{arr}}
        | | | | |  ts(488:523):  __glintDSL__.resolveOrReturn(arr)()
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(164:167): arr
        | | | | | |  ts(488:521):  __glintDSL__.resolveOrReturn(arr)
        | | | | | |
        | | | | | | | Mapping: PathExpression
        | | | | | | |  hbs(164:167): arr
        | | | | | | |  ts(517:520):  arr
        | | | | | | |
        | | | | | | | | Mapping: Identifier
        | | | | | | | |  hbs(164:167): arr
        | | | | | | | |  ts(517:520):  arr
        | | | | | | | |
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  hbs(174:181): Hash is
        | | | |  ts(526:526):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(182:187): {{h}}
        | | | |  ts(526:585):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)())
        | | | |
        | | | | | Mapping: MustacheStatement
        | | | | |  hbs(182:187): {{h}}
        | | | | |  ts(551:584):  __glintDSL__.resolveOrReturn(h)()
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(184:185): h
        | | | | | |  ts(551:582):  __glintDSL__.resolveOrReturn(h)
        | | | | | |
        | | | | | | | Mapping: PathExpression
        | | | | | | |  hbs(184:185): h
        | | | | | | |  ts(580:581):  h
        | | | | | | |
        | | | | | | | | Mapping: Identifier
        | | | | | | | |  hbs(184:185): h
        | | | | | | | |  ts(580:581):  h
        | | | | | | | |
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  hbs(187:188):
        | | | |  ts(587:587):
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(193:196): let
        | | | |  ts(610:613):  let
        | | | |
        | | |
        | |
        |"
      `);
    });

    describe('satisfies', () => {
      test('with implicit export default', () => {
        let customEnv = GlintEnvironment.load({});
        let script = {
          filename: 'test.gts',
          contents: stripIndent`
            import type { TOC } from '@ember/component/template-only';
            <template>HelloWorld!</template> satisfies TOC<{
              Blocks: { default: [] }
            }>;
          `,
        };

        let transformedModule = rewriteModule(ts, { script }, customEnv);

        expect(transformedModule?.errors).toEqual([]);
        expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
          "import type { TOC } from '@ember/component/template-only';
          export default ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {
          __glintRef__; __glintDSL__;
          }) satisfies TOC<{
            Blocks: { default: [] }
          }>;"
        `);
      });

      test('with two template-only components', () => {
        const env = GlintEnvironment.load({});

        let script = {
          filename: 'test.gts',
          contents: [
            `import type { TOC } from '@ember/component/template-only';`,
            ``,
            `const SmolComp = `,
            `  <template>`,
            `    Hello there, {{@name}}`,
            `  </template> satisfies TOC<{ Args: { name: string }}>;`,
            ``,
            `<template>`,
            `  <SmolComp @name="Ember" />`,
            `</template> satisfies TOC<{ Args: {}, Blocks: {}, Element: null }>`,
            ``,
          ].join('\n'),
        };

        let transformedModule = rewriteModule(ts, { script }, env);

        expect(transformedModule?.errors?.length).toBe(0);
        expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
          "import type { TOC } from '@ember/component/template-only';

          const SmolComp = 
            ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {
          __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.name)());
          __glintRef__; __glintDSL__;
          }) satisfies TOC<{ Args: { name: string }}>;

          export default ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {
          {
          const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(SmolComp)({ 
          name: "Ember", ...__glintDSL__.NamedArgsMarker }));
          }
          __glintRef__; __glintDSL__;
          }) satisfies TOC<{ Args: {}, Blocks: {}, Element: null }>
          "
        `);
      });
    });

    describe('unicode and other special characters', () => {
      // Issue #756: Files with unicode in a non-last component should not break Glint
      // (Verified fixed in V2 - multibyte unicode characters are handled correctly)
      describe('emoji / multibyte unicode', () => {
        test('GitHub Issue#756 - emoji in non-last template does not break parsing', () => {
          const env = GlintEnvironment.load({});

          let script = {
            filename: 'test.gts',
            contents: [
              `import type { TOC } from '@ember/component/template-only';`,
              ``,
              `const EmojiComp: TOC<{}> =`,
              `  <template>`,
              `    🎉 hello`,
              `  </template>;`,
              ``,
              `const AfterEmoji: TOC<{ Args: { name: string } }> =`,
              `  <template>`,
              `    <EmojiComp /> {{@name}}`,
              `  </template>;`,
            ].join('\n'),
          };

          let transformedModule = rewriteModule(ts, { script }, env);

          expect.soft(transformedModule?.errors?.length).toBe(0);
          expect.soft(transformedModule?.errors).toMatchInlineSnapshot(`[]`);
        });
      });

      describe('$', () => {
        test('GitHub Issue#840 - does not error', () => {
          const env = GlintEnvironment.load({});

          let script = {
            filename: 'test.gts',
            contents: [
              // https://github.com/typed-ember/glint/issues/879
              '<template>',
              '  ${{foo}}',
              '</template>',
            ].join('\n'),
          };

          let transformedModule = rewriteModule(ts, { script }, env);

          expect.soft(transformedModule?.errors?.length).toBe(0);
          expect.soft(transformedModule?.errors).toMatchInlineSnapshot(`[]`);
          expect.soft(transformedModule?.transformedContents).toMatchInlineSnapshot(`
            "export default ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {
            __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(foo)());
            __glintRef__; __glintDSL__;
            })"
          `);
        });
      });
    });
  });
});
