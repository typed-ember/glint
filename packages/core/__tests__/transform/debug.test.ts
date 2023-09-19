import ts from 'typescript';
import { describe, test, expect } from 'vitest';
import { rewriteModule } from '../../src/transform/index.js';
import { stripIndent } from 'common-tags';
import { GlintEnvironment } from '../../src/config/index.js';

describe('Transform: Debug utilities', () => {
  describe('TransformedModule#toDebugString', () => {
    test('companion template', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component from '@ember/component';

          export default class MyComponent extends Component {
            private message = 'hi';
          }
        `,
      };

      let template = {
        filename: 'test.hbs',
        contents: stripIndent`
          {{#each (array "world" "planet" "universe") as |target index|}}
            #{{add index 1}}: {{this.message}}, {{target}}!
          {{/each}}
        `,
      };

      let transformedModule = rewriteModule(
        ts,
        { script, template },
        GlintEnvironment.load('ember-loose')
      );

      expect(transformedModule?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: TemplateEmbedding
        |  in: hbs(0:123):    {{#each (array \\"world\\" \\"planet\\" \\"universe\\") as |target index|}}\\\\n  #{{add index 1}}: {{this.message}}, {{target}}!\\\\n{{/each}}
        |  out: ts(131:685):  ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).templateForBackingValue(this, function(𝚪, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {\\\\n  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"each\\"])([\\"world\\", \\"planet\\", \\"universe\\"]));\\\\n    {\\\\n      const [target, index] = 𝛄.blockParams[\\"default\\"];\\\\n      χ.emitContent(χ.resolve(χ.Globals[\\"add\\"])(index, 1));\\\\n      χ.emitContent(χ.resolveOrReturn(𝚪.this.message)());\\\\n      χ.emitContent(χ.resolveOrReturn(target)());\\\\n    }\\\\n    χ.Globals[\\"each\\"];\\\\n  }\\\\n  𝚪; χ;\\\\n})
        |
        | | Mapping: Template
        | |  in: hbs(0:123):    {{#each (array \\"world\\" \\"planet\\" \\"universe\\") as |target index|}}\\\\n  #{{add index 1}}: {{this.message}}, {{target}}!\\\\n{{/each}}
        | |  out: ts(310:674):  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"each\\"])([\\"world\\", \\"planet\\", \\"universe\\"]));\\\\n    {\\\\n      const [target, index] = 𝛄.blockParams[\\"default\\"];\\\\n      χ.emitContent(χ.resolve(χ.Globals[\\"add\\"])(index, 1));\\\\n      χ.emitContent(χ.resolveOrReturn(𝚪.this.message)());\\\\n      χ.emitContent(χ.resolveOrReturn(target)());\\\\n    }\\\\n    χ.Globals[\\"each\\"];\\\\n  }
        | |
        | | | Mapping: BlockStatement
        | | |  in: hbs(0:123):    {{#each (array \\"world\\" \\"planet\\" \\"universe\\") as |target index|}}\\\\n  #{{add index 1}}: {{this.message}}, {{target}}!\\\\n{{/each}}
        | | |  out: ts(310:673):  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"each\\"])([\\"world\\", \\"planet\\", \\"universe\\"]));\\\\n    {\\\\n      const [target, index] = 𝛄.blockParams[\\"default\\"];\\\\n      χ.emitContent(χ.resolve(χ.Globals[\\"add\\"])(index, 1));\\\\n      χ.emitContent(χ.resolveOrReturn(𝚪.this.message)());\\\\n      χ.emitContent(χ.resolveOrReturn(target)());\\\\n    }\\\\n    χ.Globals[\\"each\\"];\\\\n  }
        | | |
        | | | | Mapping: PathExpression
        | | | |  in: hbs(3:7):      each
        | | | |  out: ts(355:372):  χ.Globals[\\"each\\"]
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  in: hbs(3:7):      each
        | | | | |  out: ts(366:370):  each
        | | | | |
        | | | |
        | | | | Mapping: SubExpression
        | | | |  in: hbs(8:43):     (array \\"world\\" \\"planet\\" \\"universe\\")
        | | | |  out: ts(374:405):  [\\"world\\", \\"planet\\", \\"universe\\"]
        | | | |
        | | | | | Mapping: StringLiteral
        | | | | |  in: hbs(15:22):    \\"world\\"
        | | | | |  out: ts(375:382):  \\"world\\"
        | | | | |
        | | | | | Mapping: StringLiteral
        | | | | |  in: hbs(23:31):    \\"planet\\"
        | | | | |  out: ts(384:392):  \\"planet\\"
        | | | | |
        | | | | | Mapping: StringLiteral
        | | | | |  in: hbs(32:42):    \\"universe\\"
        | | | | |  out: ts(394:404):  \\"universe\\"
        | | | | |
        | | | |
        | | | | Mapping: Identifier
        | | | |  in: hbs(48:54):    target
        | | | |  out: ts(428:434):  target
        | | | |
        | | | | Mapping: Identifier
        | | | |  in: hbs(55:60):    index
        | | | |  out: ts(436:441):  index
        | | | |
        | | | | Mapping: TextContent
        | | | |  in: hbs(66:67):    #
        | | | |  out: ts(472:472):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  in: hbs(67:82):    {{add index 1}}
        | | | |  out: ts(472:530):  χ.emitContent(χ.resolve(χ.Globals[\\"add\\"])(index, 1))
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  in: hbs(69:72):    add
        | | | | |  out: ts(502:518):  χ.Globals[\\"add\\"]
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  in: hbs(69:72):    add
        | | | | | |  out: ts(513:516):  add
        | | | | | |
        | | | | |
        | | | | | Mapping: PathExpression
        | | | | |  in: hbs(73:78):    index
        | | | | |  out: ts(520:525):  index
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  in: hbs(73:78):    index
        | | | | | |  out: ts(520:525):  index
        | | | | | |
        | | | | |
        | | | | | Mapping: NumberLiteral
        | | | | |  in: hbs(79:80):    1
        | | | | |  out: ts(527:528):  1
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  in: hbs(82:83):    :
        | | | |  out: ts(532:532):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  in: hbs(84:100):   {{this.message}}
        | | | |  out: ts(532:589):  χ.emitContent(χ.resolveOrReturn(𝚪.this.message)())
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  in: hbs(86:98):    this.message
        | | | | |  out: ts(570:585):  𝚪.this.message
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  in: hbs(86:90):    this
        | | | | | |  out: ts(573:577):  this
        | | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  in: hbs(91:98):    message
        | | | | | |  out: ts(578:585):  message
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  in: hbs(100:101):  ,
        | | | |  out: ts(591:591):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  in: hbs(102:112):  {{target}}
        | | | |  out: ts(591:639):  χ.emitContent(χ.resolveOrReturn(target)())
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  in: hbs(104:110):  target
        | | | | |  out: ts(629:635):  target
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  in: hbs(104:110):  target
        | | | | | |  out: ts(629:635):  target
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  in: hbs(112:113):  !
        | | | |  out: ts(641:641):
        | | | |
        | | | | Mapping: Identifier
        | | | |  in: hbs(117:121):  each
        | | | |  out: ts(662:666):  each
        | | | |
        | | |
        | |
        |"
      `);
    });

    test('inline template', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component, { hbs } from '@glimmerx/component';

          export default class MyComponent extends Component {
            private bar = 'hi';

            static template = hbs\`
              <HelperComponent @foo={{this.bar}} />
            \`;
          }

          class HelperComponent extends Component<{ Args: { foo: string } }> {
            static template = hbs\`
              <p ...attributes>
                Hello, {{@foo}}!

                {{! @glint-expect-error: no @bar arg }}
                {{@bar}}
              </p>
            \`;
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, GlintEnvironment.load('glimmerx'));

      expect(transformedModule?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: TemplateEmbedding
        |  in: hbs(151:201):  hbs\`\\\\n    <HelperComponent @foo={{this.bar}} />\\\\n  \`
        |  out: ts(151:462):  ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).templateForBackingValue(this, function(𝚪, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {\\\\n  hbs;\\\\n  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar, ...χ.NamedArgsMarker }));\\\\n    𝛄;\\\\n  }\\\\n  𝚪; χ;\\\\n})
        |
        | | Mapping: Template
        | |  in: hbs(155:200):  <HelperComponent @foo={{this.bar}} />
        | |  out: ts(331:451):  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar, ...χ.NamedArgsMarker }));\\\\n    𝛄;\\\\n  }
        | |
        | | | Mapping: TextContent
        | | |  in: hbs(155:160):
        | | |  out: ts(331:331):
        | | |
        | | | Mapping: ElementNode
        | | |  in: hbs(160:197):  <HelperComponent @foo={{this.bar}} />
        | | |  out: ts(331:451):  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar, ...χ.NamedArgsMarker }));\\\\n    𝛄;\\\\n  }
        | | |
        | | | | Mapping: Identifier
        | | | |  in: hbs(161:176):  HelperComponent
        | | | |  out: ts(376:391):  HelperComponent
        | | | |
        | | | | Mapping: AttrNode
        | | | |  in: hbs(177:194):  @foo={{this.bar}}
        | | | |  out: ts(395:411):  foo: 𝚪.this.bar
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  in: hbs(178:181):  foo
        | | | | |  out: ts(395:398):  foo
        | | | | |
        | | | | | Mapping: MustacheStatement
        | | | | |  in: hbs(182:194):  {{this.bar}}
        | | | | |  out: ts(400:411):  𝚪.this.bar
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  in: hbs(184:192):  this.bar
        | | | | | |  out: ts(400:411):  𝚪.this.bar
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  in: hbs(184:188):  this
        | | | | | | |  out: ts(403:407):  this
        | | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  in: hbs(189:192):  bar
        | | | | | | |  out: ts(408:411):  bar
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  in: hbs(197:200):
        | | |  out: ts(451:451):
        | | |
        | |
        |

        | Mapping: TemplateEmbedding
        |  in: hbs(295:419):  hbs\`\\\\n    <p ...attributes>\\\\n      Hello, {{@foo}}!\\\\n\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\n      {{@bar}}\\\\n    </p>\\\\n  \`
        |  out: ts(556:973):  ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).templateForBackingValue(this, function(𝚪, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {\\\\n  hbs;\\\\n  {\\\\n    const 𝛄 = χ.emitElement(\\"p\\");\\\\n    χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)());\\\\n    // @glint-expect-error\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)());\\\\n  }\\\\n  𝚪; χ;\\\\n})
        |
        | | Mapping: Template
        | |  in: hbs(299:418):  <p ...attributes>\\\\n      Hello, {{@foo}}!\\\\n\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\n      {{@bar}}\\\\n    </p>
        | |  out: ts(736:962):  {\\\\n    const 𝛄 = χ.emitElement(\\"p\\");\\\\n    χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)());\\\\n    // @glint-expect-error\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)());\\\\n  }
        | |
        | | | Mapping: TextContent
        | | |  in: hbs(299:304):
        | | |  out: ts(736:736):
        | | |
        | | | Mapping: ElementNode
        | | |  in: hbs(304:415):  <p ...attributes>\\\\n      Hello, {{@foo}}!\\\\n\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\n      {{@bar}}\\\\n    </p>
        | | |  out: ts(736:962):  {\\\\n    const 𝛄 = χ.emitElement(\\"p\\");\\\\n    χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)());\\\\n    // @glint-expect-error\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)());\\\\n  }
        | | |
        | | | | Mapping: AttrNode
        | | | |  in: hbs(307:320):  ...attributes
        | | | |  out: ts(775:824):  χ.applySplattributes(𝚪.element, 𝛄.element);
        | | | |
        | | | | Mapping: TextContent
        | | | |  in: hbs(328:334):  Hello,
        | | | |  out: ts(825:825):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  in: hbs(335:343):  {{@foo}}
        | | | |  out: ts(825:876):  χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)())
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  in: hbs(337:341):  @foo
        | | | | |  out: ts(861:872):  𝚪.args.foo
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  in: hbs(338:341):  foo
        | | | | | |  out: ts(869:872):  foo
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  in: hbs(343:344):  !
        | | | |  out: ts(878:878):
        | | | |
        | | | | Mapping: MustacheCommentStatement
        | | | |  in: hbs(352:391):  {{! @glint-expect-error: no @bar arg }}
        | | | |  out: ts(878:905):  // @glint-expect-error
        | | | |
        | | | | Mapping: TextContent
        | | | |  in: hbs(392:398):
        | | | |  out: ts(905:905):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  in: hbs(398:406):  {{@bar}}
        | | | |  out: ts(905:956):  χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)())
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  in: hbs(400:404):  @bar
        | | | | |  out: ts(941:952):  𝚪.args.bar
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  in: hbs(401:404):  bar
        | | | | | |  out: ts(949:952):  bar
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  in: hbs(406:411):
        | | | |  out: ts(958:958):
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  in: hbs(415:418):
        | | |  out: ts(962:962):
        | | |
        | |
        |"
      `);
    });

    test('Windows line endings', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component, { hbs } from '@glimmerx/component';

          export default class MyComponent extends Component {
            private bar = 'hi';

            static template = hbs\`
              <HelperComponent @foo={{this.bar}} />
            \`;
          }

          class HelperComponent extends Component<{ Args: { foo: string } }> {
            static template = hbs\`
              <p ...attributes>
                Hello, {{@foo}}!

                {{! @glint-expect-error: no @bar arg }}
                {{@bar}}
              </p>
            \`;
          }
        `.replace(/\n/g, '\r\n'),
      };

      let transformedModule = rewriteModule(ts, { script }, GlintEnvironment.load('glimmerx'));

      expect(transformedModule?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: TemplateEmbedding
        |  in: hbs(156:208):  hbs\`\\\\r\\\\n    <HelperComponent @foo={{this.bar}} />\\\\r\\\\n  \`
        |  out: ts(156:467):  ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).templateForBackingValue(this, function(𝚪, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {\\\\n  hbs;\\\\n  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar, ...χ.NamedArgsMarker }));\\\\n    𝛄;\\\\n  }\\\\n  𝚪; χ;\\\\n})
        |
        | | Mapping: Template
        | |  in: hbs(160:207):  <HelperComponent @foo={{this.bar}} />
        | |  out: ts(336:456):  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar, ...χ.NamedArgsMarker }));\\\\n    𝛄;\\\\n  }
        | |
        | | | Mapping: TextContent
        | | |  in: hbs(160:166):
        | | |  out: ts(336:336):
        | | |
        | | | Mapping: ElementNode
        | | |  in: hbs(166:203):  <HelperComponent @foo={{this.bar}} />
        | | |  out: ts(336:456):  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar, ...χ.NamedArgsMarker }));\\\\n    𝛄;\\\\n  }
        | | |
        | | | | Mapping: Identifier
        | | | |  in: hbs(167:182):  HelperComponent
        | | | |  out: ts(381:396):  HelperComponent
        | | | |
        | | | | Mapping: AttrNode
        | | | |  in: hbs(183:200):  @foo={{this.bar}}
        | | | |  out: ts(400:416):  foo: 𝚪.this.bar
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  in: hbs(184:187):  foo
        | | | | |  out: ts(400:403):  foo
        | | | | |
        | | | | | Mapping: MustacheStatement
        | | | | |  in: hbs(188:200):  {{this.bar}}
        | | | | |  out: ts(405:416):  𝚪.this.bar
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  in: hbs(190:198):  this.bar
        | | | | | |  out: ts(405:416):  𝚪.this.bar
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  in: hbs(190:194):  this
        | | | | | | |  out: ts(408:412):  this
        | | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  in: hbs(195:198):  bar
        | | | | | | |  out: ts(413:416):  bar
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  in: hbs(203:207):
        | | |  out: ts(456:456):
        | | |
        | |
        |

        | Mapping: TemplateEmbedding
        |  in: hbs(306:437):  hbs\`\\\\r\\\\n    <p ...attributes>\\\\r\\\\n      Hello, {{@foo}}!\\\\r\\\\n\\\\r\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\r\\\\n      {{@bar}}\\\\r\\\\n    </p>\\\\r\\\\n  \`
        |  out: ts(565:982):  ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).templateForBackingValue(this, function(𝚪, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {\\\\n  hbs;\\\\n  {\\\\n    const 𝛄 = χ.emitElement(\\"p\\");\\\\n    χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)());\\\\n    // @glint-expect-error\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)());\\\\n  }\\\\n  𝚪; χ;\\\\n})
        |
        | | Mapping: Template
        | |  in: hbs(310:436):  <p ...attributes>\\\\r\\\\n      Hello, {{@foo}}!\\\\r\\\\n\\\\r\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\r\\\\n      {{@bar}}\\\\r\\\\n    </p>
        | |  out: ts(745:971):  {\\\\n    const 𝛄 = χ.emitElement(\\"p\\");\\\\n    χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)());\\\\n    // @glint-expect-error\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)());\\\\n  }
        | |
        | | | Mapping: TextContent
        | | |  in: hbs(310:316):
        | | |  out: ts(745:745):
        | | |
        | | | Mapping: ElementNode
        | | |  in: hbs(316:432):  <p ...attributes>\\\\r\\\\n      Hello, {{@foo}}!\\\\r\\\\n\\\\r\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\r\\\\n      {{@bar}}\\\\r\\\\n    </p>
        | | |  out: ts(745:971):  {\\\\n    const 𝛄 = χ.emitElement(\\"p\\");\\\\n    χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)());\\\\n    // @glint-expect-error\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)());\\\\n  }
        | | |
        | | | | Mapping: AttrNode
        | | | |  in: hbs(319:332):  ...attributes
        | | | |  out: ts(784:833):  χ.applySplattributes(𝚪.element, 𝛄.element);
        | | | |
        | | | | Mapping: TextContent
        | | | |  in: hbs(340:347):  Hello,
        | | | |  out: ts(834:834):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  in: hbs(348:356):  {{@foo}}
        | | | |  out: ts(834:885):  χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)())
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  in: hbs(350:354):  @foo
        | | | | |  out: ts(870:881):  𝚪.args.foo
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  in: hbs(351:354):  foo
        | | | | | |  out: ts(878:881):  foo
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  in: hbs(356:359):  !
        | | | |  out: ts(887:887):
        | | | |
        | | | | Mapping: MustacheCommentStatement
        | | | |  in: hbs(367:406):  {{! @glint-expect-error: no @bar arg }}
        | | | |  out: ts(887:914):  // @glint-expect-error
        | | | |
        | | | | Mapping: TextContent
        | | | |  in: hbs(408:414):
        | | | |  out: ts(914:914):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  in: hbs(414:422):  {{@bar}}
        | | | |  out: ts(914:965):  χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)())
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  in: hbs(416:420):  @bar
        | | | | |  out: ts(950:961):  𝚪.args.bar
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  in: hbs(417:420):  bar
        | | | | | |  out: ts(958:961):  bar
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  in: hbs(422:428):
        | | | |  out: ts(967:967):
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  in: hbs(432:436):
        | | |  out: ts(971:971):
        | | |
        | |
        |"
      `);
    });
  });
});
