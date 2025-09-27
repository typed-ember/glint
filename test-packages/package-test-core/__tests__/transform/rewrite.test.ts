import { GlintEnvironment } from '@glint/core/config/index';
import { rewriteModule } from '@glint/core/transform/index';
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
          static { ({} as typeof import("@glint/core/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/core/-private/dsl")) {
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
        "export default ({} as typeof import("@glint/core/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/core/-private/dsl")) {
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
        "export default ({} as typeof import("@glint/core/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/core/-private/dsl")) {
        __glintRef__; __glintDSL__;
        });"
      `);
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
          static { ({} as typeof import("@glint/core/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/core/-private/dsl")) {
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
          static { ({} as typeof import("@glint/core/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/core/-private/dsl")) {
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
          static { ({} as typeof import("@glint/core/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/core/-private/dsl")) {
        __glintRef__; __glintDSL__;
        }) }
        }"
      `);
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
        export default class MyComponent extends Component(({} as typeof import("@glint/core/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/core/-private/dsl")) {
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
      let roundTripOffset = (offset: number): number | undefined =>
        rewritten?.getOriginalOffset(rewritten.getTransformedOffset(script.filename, offset))
          .offset;

      let classOffset = script.contents.indexOf('MyComponent');
      let accessOffset = script.contents.indexOf('this.target');
      let fieldOffset = script.contents.indexOf('private target');

      expect(roundTripOffset(classOffset)).toEqual(classOffset);
      expect(roundTripOffset(accessOffset)).toEqual(accessOffset);
      expect(roundTripOffset(fieldOffset)).toEqual(fieldOffset);

      expect(rewritten?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: TemplateEmbedding
        |  hbs(22:74):   <template>\\n    Hello, {{this.target}}!\\n  </template>
        |  ts(22:309):   static { ({} as typeof import("@glint/core/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/core/-private/dsl")) {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.target)());\\n__glintRef__; __glintDSL__;\\n}) }
        |
        | | Mapping: Template
        | |  hbs(32:63):   Hello, {{this.target}}!
        | |  ts(193:277):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.target)());
        | |
        | | | Mapping: TextContent
        | | |  hbs(37:43):   Hello,
        | | |  ts(193:193):
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(44:59):   {{this.target}}
        | | |  ts(193:275):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.target)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(44:59):   {{this.target}}
        | | | |  ts(218:274):  __glintDSL__.resolveOrReturn(__glintRef__.this.target)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(46:57):   this.target
        | | | | |  ts(247:271):  __glintRef__.this.target
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(46:50):   this
        | | | | | |  ts(260:264):  this
        | | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(51:57):   target
        | | | | | |  ts(265:271):  target
        | | | | | |
        | | | | |
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  hbs(59:60):   !
        | | |  ts(277:277):
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
        |  ts(0:280):    export default ({} as typeof import("@glint/core/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/core/-private/dsl")) {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.target)());\\n__glintRef__; __glintDSL__;\\n})
        |
        | | Mapping: Template
        | |  hbs(10:33):   Hello, {{@target}}!
        | |  ts(166:250):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.target)());
        | |
        | | | Mapping: TextContent
        | | |  hbs(13:19):   Hello,
        | | |  ts(166:166):
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(20:31):   {{@target}}
        | | |  ts(166:248):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.target)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(20:31):   {{@target}}
        | | | |  ts(191:247):  __glintDSL__.resolveOrReturn(__glintRef__.args.target)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(22:29):   @target
        | | | | |  ts(220:244):  __glintRef__.args.target
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(23:29):   target
        | | | | | |  ts(238:244):  target
        | | | | | |
        | | | | |
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  hbs(31:32):   !
        | | |  ts(250:250):
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
      let roundTripOffset = (offset: number): number | undefined =>
        rewritten?.getOriginalOffset(rewritten.getTransformedOffset(script.filename, offset))
          .offset;

      let classOffset = script.contents.indexOf('MyComponent');
      let firstTemplateOffset = script.contents.indexOf('@message');
      let secondTemplateOffset = script.contents.indexOf('this.title');

      expect(roundTripOffset(classOffset)).toEqual(classOffset);
      expect(roundTripOffset(firstTemplateOffset)).toEqual(firstTemplateOffset);
      expect(roundTripOffset(secondTemplateOffset)).toEqual(secondTemplateOffset);

      expect(rewritten?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: TemplateEmbedding
        |  hbs(56:89):   <template>{{@message}}</template>
        |  ts(56:322):   ({} as typeof import("@glint/core/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/core/-private/dsl")) {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.message)());\\n__glintRef__; __glintDSL__;\\n})
        |
        | | Mapping: Template
        | |  hbs(66:78):   {{@message}}
        | |  ts(207:292):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.message)());
        | |
        | | | Mapping: MustacheStatement
        | | |  hbs(66:78):   {{@message}}
        | | |  ts(207:290):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.message)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(66:78):   {{@message}}
        | | | |  ts(232:289):  __glintDSL__.resolveOrReturn(__glintRef__.args.message)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(68:76):   @message
        | | | | |  ts(261:286):  __glintRef__.args.message
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(69:76):   message
        | | | | | |  ts(279:286):  message
        | | | | | |
        | | | | |
        | | | |
        | | |
        | |
        |

        | Mapping: TemplateEmbedding
        |  hbs(139:174): <template>{{this.title}}</template>
        |  ts(372:658):  static { ({} as typeof import("@glint/core/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/core/-private/dsl")) {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.title)());\\n__glintRef__; __glintDSL__;\\n}) }
        |
        | | Mapping: Template
        | |  hbs(149:163): {{this.title}}
        | |  ts(543:626):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.title)());
        | |
        | | | Mapping: MustacheStatement
        | | |  hbs(149:163): {{this.title}}
        | | |  ts(543:624):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.title)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(149:163): {{this.title}}
        | | | |  ts(568:623):  __glintDSL__.resolveOrReturn(__glintRef__.this.title)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(151:161): this.title
        | | | | |  ts(597:620):  __glintRef__.this.title
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(151:155): this
        | | | | | |  ts(610:614):  this
        | | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(156:161): title
        | | | | | |  ts(615:620):  title
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
        |  ts(58:643):   export default ({} as typeof import("@glint/core/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/core/-private/dsl")) {\\n{\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["let"])((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n}))));\\n{\\nconst [arr, h] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());\\n}\\n__glintDSL__.Globals["let"];\\n}\\n__glintRef__; __glintDSL__;\\n})
        |
        | | Mapping: Template
        | |  hbs(68:199):  {{! Intentionally shadowing }}\\n  {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | |  ts(224:613):  {\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["let"])((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n}))));\\n{\\nconst [arr, h] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());\\n}\\n__glintDSL__.Globals["let"];\\n}
        | |
        | | | Mapping: TextContent
        | | |  hbs(68:69):
        | | |  ts(224:224):
        | | |
        | | | Mapping: MustacheCommentStatement
        | | |  hbs(71:101):  {{! Intentionally shadowing }}
        | | |  ts(224:224):
        | | |
        | | | Mapping: BlockStatement
        | | |  hbs(104:198): {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | | |  ts(224:612):  {\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["let"])((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n}))));\\n{\\nconst [arr, h] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());\\n}\\n__glintDSL__.Globals["let"];\\n}
        | | |
        | | | | Mapping: BlockStatement
        | | | |  hbs(104:198): {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | | | |  ts(272:399):  __glintDSL__.resolve(__glintDSL__.Globals["let"])((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n})))
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(107:110): let
        | | | | |  ts(293:320):  __glintDSL__.Globals["let"]
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(107:110): let
        | | | | | |  ts(315:318):  let
        | | | | | |
        | | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(112:115): arr
        | | | | |  ts(341:344):  arr
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(112:115): arr
        | | | | | |  ts(341:344):  arr
        | | | | | |
        | | | | |
        | | | | | Mapping: SubExpression
        | | | | |  hbs(111:120): (arr 1 2)
        | | | | |  ts(347:353):  [1, 2]
        | | | | |
        | | | | | | Mapping: NumberLiteral
        | | | | | |  hbs(116:117): 1
        | | | | | |  ts(348:349):  1
        | | | | | |
        | | | | | | Mapping: NumberLiteral
        | | | | | |  hbs(118:119): 2
        | | | | | |  ts(351:352):  2
        | | | | | |
        | | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(122:123): h
        | | | | |  ts(375:376):  h
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(122:123): h
        | | | | | |  ts(375:376):  h
        | | | | | |
        | | | | |
        | | | | | Mapping: SubExpression
        | | | | |  hbs(121:135): (h red="blue")
        | | | | |  ts(379:397):  ({\\nred: "blue",\\n})
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(124:127): red
        | | | | | |  ts(382:385):  red
        | | | | | |
        | | | | | | Mapping: StringLiteral
        | | | | | |  hbs(128:134): "blue"
        | | | | | |  ts(387:393):  "blue"
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(140:143): arr
        | | | |  ts(411:414):  arr
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(144:145): h
        | | | |  ts(416:417):  h
        | | | |
        | | | | Mapping: TextContent
        | | | |  hbs(153:161): Array is
        | | | |  ts(456:456):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(162:169): {{arr}}
        | | | |  ts(456:517):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)())
        | | | |
        | | | | | Mapping: MustacheStatement
        | | | | |  hbs(162:169): {{arr}}
        | | | | |  ts(481:516):  __glintDSL__.resolveOrReturn(arr)()
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(164:167): arr
        | | | | | |  ts(510:513):  arr
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(164:167): arr
        | | | | | | |  ts(510:513):  arr
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  hbs(174:181): Hash is
        | | | |  ts(519:519):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(182:187): {{h}}
        | | | |  ts(519:578):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)())
        | | | |
        | | | | | Mapping: MustacheStatement
        | | | | |  hbs(182:187): {{h}}
        | | | | |  ts(544:577):  __glintDSL__.resolveOrReturn(h)()
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(184:185): h
        | | | | | |  ts(573:574):  h
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(184:185): h
        | | | | | | |  ts(573:574):  h
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  hbs(187:188):
        | | | |  ts(580:580):
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(193:196): let
        | | | |  ts(604:607):  let
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
          export default ({} as typeof import("@glint/core/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/core/-private/dsl")) {
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
            ({} as typeof import("@glint/core/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/core/-private/dsl")) {
          __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.name)());
          __glintRef__; __glintDSL__;
          }) satisfies TOC<{ Args: { name: string }}>;

          export default ({} as typeof import("@glint/core/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/core/-private/dsl")) {
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
            "export default ({} as typeof import("@glint/core/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/core/-private/dsl")) {
            __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(foo)());
            __glintRef__; __glintDSL__;
            })"
          `);
        });
      });
    });
  });
});
