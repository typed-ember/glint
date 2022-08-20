import ts from 'typescript';
import { describe, test, expect } from 'vitest';
import { rewriteModule } from '../src';
import { stripIndent } from 'common-tags';
import { GlintEnvironment } from '@glint/config/lib/environment';

describe('Debug utilities', () => {
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

        | Mapping: Template
        |  hbs(0:123):   {{#each (array \\"world\\" \\"planet\\" \\"universe\\") as |target index|}}\\\\n  #{{add index 1}}: {{this.message}}, {{target}}!\\\\n{{/each}}
        |  ts(165:804):  ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-ember-loose/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {\\\\n  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"each\\"])({}, [\\"world\\", \\"planet\\", \\"universe\\"]));\\\\n    {\\\\n      const [target, index] = 𝛄.blockParams[\\"default\\"];\\\\n      χ.emitContent(χ.resolve(χ.Globals[\\"add\\"])({}, index, 1));\\\\n      χ.emitContent(χ.resolveOrReturn(𝚪.this.message)({}));\\\\n      χ.emitContent(χ.resolveOrReturn(target)({}));\\\\n    }\\\\n    χ.Globals[\\"each\\"];\\\\n  }\\\\n  𝚪; χ;\\\\n}) as unknown
        |
        | | Mapping: Identifier
        | |  hbs(0:0):
        | |  ts(325:336):  MyComponent
        | |
        | | Mapping: BlockStatement
        | |  hbs(0:123):   {{#each (array \\"world\\" \\"planet\\" \\"universe\\") as |target index|}}\\\\n  #{{add index 1}}: {{this.message}}, {{target}}!\\\\n{{/each}}
        | |  ts(406:781):  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"each\\"])({}, [\\"world\\", \\"planet\\", \\"universe\\"]));\\\\n    {\\\\n      const [target, index] = 𝛄.blockParams[\\"default\\"];\\\\n      χ.emitContent(χ.resolve(χ.Globals[\\"add\\"])({}, index, 1));\\\\n      χ.emitContent(χ.resolveOrReturn(𝚪.this.message)({}));\\\\n      χ.emitContent(χ.resolveOrReturn(target)({}));\\\\n    }\\\\n    χ.Globals[\\"each\\"];\\\\n  }
        | |
        | | | Mapping: PathExpression
        | | |  hbs(3:7):     each
        | | |  ts(451:468):  χ.Globals[\\"each\\"]
        | | |
        | | | | Mapping: Identifier
        | | | |  hbs(3:7):     each
        | | | |  ts(462:466):  each
        | | | |
        | | |
        | | | Mapping: SubExpression
        | | |  hbs(8:43):    (array \\"world\\" \\"planet\\" \\"universe\\")
        | | |  ts(474:505):  [\\"world\\", \\"planet\\", \\"universe\\"]
        | | |
        | | | | Mapping: StringLiteral
        | | | |  hbs(15:22):   \\"world\\"
        | | | |  ts(475:482):  \\"world\\"
        | | | |
        | | | | Mapping: StringLiteral
        | | | |  hbs(23:31):   \\"planet\\"
        | | | |  ts(484:492):  \\"planet\\"
        | | | |
        | | | | Mapping: StringLiteral
        | | | |  hbs(32:42):   \\"universe\\"
        | | | |  ts(494:504):  \\"universe\\"
        | | | |
        | | |
        | | | Mapping: Identifier
        | | |  hbs(48:54):   target
        | | |  ts(528:534):  target
        | | |
        | | | Mapping: Identifier
        | | |  hbs(55:60):   index
        | | |  ts(536:541):  index
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(67:82):   {{add index 1}}
        | | |  ts(572:634):  χ.emitContent(χ.resolve(χ.Globals[\\"add\\"])({}, index, 1))
        | | |
        | | | | Mapping: PathExpression
        | | | |  hbs(69:72):   add
        | | | |  ts(602:618):  χ.Globals[\\"add\\"]
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(69:72):   add
        | | | | |  ts(613:616):  add
        | | | | |
        | | | |
        | | | | Mapping: PathExpression
        | | | |  hbs(73:78):   index
        | | | |  ts(624:629):  index
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(73:78):   index
        | | | | |  ts(624:629):  index
        | | | | |
        | | | |
        | | | | Mapping: NumberLiteral
        | | | |  hbs(79:80):   1
        | | | |  ts(631:632):  1
        | | | |
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(84:100):  {{this.message}}
        | | |  ts(636:695):  χ.emitContent(χ.resolveOrReturn(𝚪.this.message)({}))
        | | |
        | | | | Mapping: PathExpression
        | | | |  hbs(86:98):   this.message
        | | | |  ts(674:689):  𝚪.this.message
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(86:90):   this
        | | | | |  ts(677:681):  this
        | | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(91:98):   message
        | | | | |  ts(682:689):  message
        | | | | |
        | | | |
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(102:112): {{target}}
        | | |  ts(697:747):  χ.emitContent(χ.resolveOrReturn(target)({}))
        | | |
        | | | | Mapping: PathExpression
        | | | |  hbs(104:110): target
        | | | |  ts(735:741):  target
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(104:110): target
        | | | | |  ts(735:741):  target
        | | | | |
        | | | |
        | | |
        | | | Mapping: Identifier
        | | |  hbs(117:121): each
        | | |  ts(770:774):  each
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

        | Mapping: Template
        |  hbs(151:201): hbs\`\\\\n    <HelperComponent @foo={{this.bar}} />\\\\n  \`
        |  ts(151:510):  ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {\\\\n  hbs;\\\\n  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }));\\\\n    𝛄;\\\\n  }\\\\n  𝚪; χ;\\\\n}) as unknown
        |
        | | Mapping: Identifier
        | |  hbs(151:151):
        | |  ts(305:316):  MyComponent
        | |
        | | Mapping: ElementNode
        | |  hbs(160:197): <HelperComponent @foo={{this.bar}} />
        | |  ts(390:488):  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }));\\\\n    𝛄;\\\\n  }
        | |
        | | | Mapping: Identifier
        | | |  hbs(161:176): HelperComponent
        | | |  ts(435:450):  HelperComponent
        | | |
        | | | Mapping: AttrNode
        | | |  hbs(177:194): @foo={{this.bar}}
        | | |  ts(454:470):  foo: 𝚪.this.bar
        | | |
        | | | | Mapping: Identifier
        | | | |  hbs(178:181): foo
        | | | |  ts(454:457):  foo
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(182:194): {{this.bar}}
        | | | |  ts(459:470):  𝚪.this.bar
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(184:192): this.bar
        | | | | |  ts(459:470):  𝚪.this.bar
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(184:188): this
        | | | | | |  ts(462:466):  this
        | | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(189:192): bar
        | | | | | |  ts(467:470):  bar
        | | | | | |
        | | | | |
        | | | |
        | | |
        | |
        |

        | Mapping: Template
        |  hbs(295:419): hbs\`\\\\n    <p ...attributes>\\\\n      Hello, {{@foo}}!\\\\n\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\n      {{@bar}}\\\\n    </p>\\\\n  \`
        |  ts(604:1072): ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<HelperComponent>, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {\\\\n  hbs;\\\\n  {\\\\n    const 𝛄 = χ.emitElement(\\"p\\");\\\\n    χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)({}));\\\\n  }\\\\n  𝚪; χ;\\\\n}) as unknown
        |
        | | Mapping: Identifier
        | |  hbs(295:295):
        | |  ts(758:773):  HelperComponent
        | |
        | | Mapping: ElementNode
        | |  hbs(304:415): <p ...attributes>\\\\n      Hello, {{@foo}}!\\\\n\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\n      {{@bar}}\\\\n    </p>
        | |  ts(847:1050): {\\\\n    const 𝛄 = χ.emitElement(\\"p\\");\\\\n    χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)({}));\\\\n  }
        | |
        | | | Mapping: AttrNode
        | | |  hbs(307:320): ...attributes
        | | |  ts(886:935):  χ.applySplattributes(𝚪.element, 𝛄.element);
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(335:343): {{@foo}}
        | | |  ts(936:989):  χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)({}))
        | | |
        | | | | Mapping: PathExpression
        | | | |  hbs(337:341): @foo
        | | | |  ts(972:983):  𝚪.args.foo
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(338:341): foo
        | | | | |  ts(980:983):  foo
        | | | | |
        | | | |
        | | |
        | | | Mapping: MustacheCommentStatement
        | | |  hbs(352:391): {{! @glint-expect-error: no @bar arg }}
        | | |  ts(991:991):
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(398:406): {{@bar}}
        | | |  ts(991:1044): χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)({}))
        | | |
        | | | | Mapping: PathExpression
        | | | |  hbs(400:404): @bar
        | | | |  ts(1027:1038):𝚪.args.bar
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(401:404): bar
        | | | | |  ts(1035:1038):bar
        | | | | |
        | | | |
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

        | Mapping: Template
        |  hbs(156:208): hbs\`\\\\r\\\\n    <HelperComponent @foo={{this.bar}} />\\\\r\\\\n  \`
        |  ts(156:515):  ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {\\\\n  hbs;\\\\n  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }));\\\\n    𝛄;\\\\n  }\\\\n  𝚪; χ;\\\\n}) as unknown
        |
        | | Mapping: Identifier
        | |  hbs(156:156):
        | |  ts(310:321):  MyComponent
        | |
        | | Mapping: ElementNode
        | |  hbs(166:203): <HelperComponent @foo={{this.bar}} />
        | |  ts(395:493):  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }));\\\\n    𝛄;\\\\n  }
        | |
        | | | Mapping: Identifier
        | | |  hbs(167:182): HelperComponent
        | | |  ts(440:455):  HelperComponent
        | | |
        | | | Mapping: AttrNode
        | | |  hbs(183:200): @foo={{this.bar}}
        | | |  ts(459:475):  foo: 𝚪.this.bar
        | | |
        | | | | Mapping: Identifier
        | | | |  hbs(184:187): foo
        | | | |  ts(459:462):  foo
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(188:200): {{this.bar}}
        | | | |  ts(464:475):  𝚪.this.bar
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(190:198): this.bar
        | | | | |  ts(464:475):  𝚪.this.bar
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(190:194): this
        | | | | | |  ts(467:471):  this
        | | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(195:198): bar
        | | | | | |  ts(472:475):  bar
        | | | | | |
        | | | | |
        | | | |
        | | |
        | |
        |

        | Mapping: Template
        |  hbs(306:437): hbs\`\\\\r\\\\n    <p ...attributes>\\\\r\\\\n      Hello, {{@foo}}!\\\\r\\\\n\\\\r\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\r\\\\n      {{@bar}}\\\\r\\\\n    </p>\\\\r\\\\n  \`
        |  ts(613:1081): ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<HelperComponent>, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {\\\\n  hbs;\\\\n  {\\\\n    const 𝛄 = χ.emitElement(\\"p\\");\\\\n    χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)({}));\\\\n  }\\\\n  𝚪; χ;\\\\n}) as unknown
        |
        | | Mapping: Identifier
        | |  hbs(306:306):
        | |  ts(767:782):  HelperComponent
        | |
        | | Mapping: ElementNode
        | |  hbs(316:432): <p ...attributes>\\\\r\\\\n      Hello, {{@foo}}!\\\\r\\\\n\\\\r\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\r\\\\n      {{@bar}}\\\\r\\\\n    </p>
        | |  ts(856:1059): {\\\\n    const 𝛄 = χ.emitElement(\\"p\\");\\\\n    χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)({}));\\\\n  }
        | |
        | | | Mapping: AttrNode
        | | |  hbs(319:332): ...attributes
        | | |  ts(895:944):  χ.applySplattributes(𝚪.element, 𝛄.element);
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(348:356): {{@foo}}
        | | |  ts(945:998):  χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)({}))
        | | |
        | | | | Mapping: PathExpression
        | | | |  hbs(350:354): @foo
        | | | |  ts(981:992):  𝚪.args.foo
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(351:354): foo
        | | | | |  ts(989:992):  foo
        | | | | |
        | | | |
        | | |
        | | | Mapping: MustacheCommentStatement
        | | |  hbs(367:406): {{! @glint-expect-error: no @bar arg }}
        | | |  ts(1000:1000):
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(414:422): {{@bar}}
        | | |  ts(1000:1053):χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)({}))
        | | |
        | | | | Mapping: PathExpression
        | | | |  hbs(416:420): @bar
        | | | |  ts(1036:1047):𝚪.args.bar
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(417:420): bar
        | | | | |  ts(1044:1047):bar
        | | | | |
        | | | |
        | | |
        | |
        |"
      `);
    });
  });
});
