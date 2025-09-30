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
        | | | | |  ts(257:281):  __glintRef__.this.target
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(46:50):   this
        | | | | | |  ts(270:274):  this
        | | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(51:57):   target
        | | | | | |  ts(275:281):  target
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
        | | | | |  ts(230:254):  __glintRef__.args.target
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(23:29):   target
        | | | | | |  ts(248:254):  target
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
        | | | | |  ts(271:296):  __glintRef__.args.message
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(69:76):   message
        | | | | | |  ts(289:296):  message
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
        | | | | |  ts(617:640):  __glintRef__.this.title
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(151:155): this
        | | | | | |  ts(630:634):  this
        | | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(156:161): title
        | | | | | |  ts(635:640):  title
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
        |  ts(58:653):   export default ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {\\n{\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["let"])((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n}))));\\n{\\nconst [arr, h] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());\\n}\\n__glintDSL__.Globals["let"];\\n}\\n__glintRef__; __glintDSL__;\\n})
        |
        | | Mapping: Template
        | |  hbs(68:199):  {{! Intentionally shadowing }}\\n  {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | |  ts(94:125):   "@glint/ember-tsc/-private/dsl"
        | |
        | | Mapping: Template
        | |  hbs(68:199):  {{! Intentionally shadowing }}\\n  {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | |  ts(234:623):  {\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["let"])((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n}))));\\n{\\nconst [arr, h] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());\\n}\\n__glintDSL__.Globals["let"];\\n}
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
        | | |  ts(234:622):  {\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["let"])((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n}))));\\n{\\nconst [arr, h] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());\\n}\\n__glintDSL__.Globals["let"];\\n}
        | | |
        | | | | Mapping: BlockStatement
        | | | |  hbs(104:198): {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | | | |  ts(282:409):  __glintDSL__.resolve(__glintDSL__.Globals["let"])((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n})))
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(107:110): let
        | | | | |  ts(303:330):  __glintDSL__.Globals["let"]
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(107:110): let
        | | | | | |  ts(325:328):  let
        | | | | | |
        | | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(112:115): arr
        | | | | |  ts(351:354):  arr
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(112:115): arr
        | | | | | |  ts(351:354):  arr
        | | | | | |
        | | | | |
        | | | | | Mapping: SubExpression
        | | | | |  hbs(111:120): (arr 1 2)
        | | | | |  ts(357:363):  [1, 2]
        | | | | |
        | | | | | | Mapping: NumberLiteral
        | | | | | |  hbs(116:117): 1
        | | | | | |  ts(358:359):  1
        | | | | | |
        | | | | | | Mapping: NumberLiteral
        | | | | | |  hbs(118:119): 2
        | | | | | |  ts(361:362):  2
        | | | | | |
        | | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(122:123): h
        | | | | |  ts(385:386):  h
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(122:123): h
        | | | | | |  ts(385:386):  h
        | | | | | |
        | | | | |
        | | | | | Mapping: SubExpression
        | | | | |  hbs(121:135): (h red="blue")
        | | | | |  ts(389:407):  ({\\nred: "blue",\\n})
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(124:127): red
        | | | | | |  ts(392:395):  red
        | | | | | |
        | | | | | | Mapping: StringLiteral
        | | | | | |  hbs(128:134): "blue"
        | | | | | |  ts(397:403):  "blue"
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(140:143): arr
        | | | |  ts(421:424):  arr
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(144:145): h
        | | | |  ts(426:427):  h
        | | | |
        | | | | Mapping: TextContent
        | | | |  hbs(153:161): Array is
        | | | |  ts(466:466):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(162:169): {{arr}}
        | | | |  ts(466:527):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)())
        | | | |
        | | | | | Mapping: MustacheStatement
        | | | | |  hbs(162:169): {{arr}}
        | | | | |  ts(491:526):  __glintDSL__.resolveOrReturn(arr)()
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(164:167): arr
        | | | | | |  ts(520:523):  arr
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(164:167): arr
        | | | | | | |  ts(520:523):  arr
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  hbs(174:181): Hash is
        | | | |  ts(529:529):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(182:187): {{h}}
        | | | |  ts(529:588):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)())
        | | | |
        | | | | | Mapping: MustacheStatement
        | | | | |  hbs(182:187): {{h}}
        | | | | |  ts(554:587):  __glintDSL__.resolveOrReturn(h)()
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(184:185): h
        | | | | | |  ts(583:584):  h
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(184:185): h
        | | | | | | |  ts(583:584):  h
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  hbs(187:188):
        | | | |  ts(590:590):
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(193:196): let
        | | | |  ts(614:617):  let
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
