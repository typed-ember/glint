import { rewriteModule } from '../src';
import { stripIndent } from 'common-tags';
import { GlintEnvironment } from '@glint/config';

describe('Debug utilities', () => {
  describe('TransformedModule#toDebugString', () => {
    test('companion template', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component from '@glint/environment-ember-loose/ember-component';

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
        { script, template },
        GlintEnvironment.load('ember-loose')
      );

      expect(transformedModule?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: Template
        |  hbs(0:123):   {{#each (array \\"world\\" \\"planet\\" \\"universe\\") as |target index|}}\\\\n  #{{add index 1}}: {{this.message}}, {{target}}!\\\\n{{/each}}
        |  ts(183:813):  ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-ember-loose/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {\\\\n  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"each\\"])({}, [\\"world\\", \\"planet\\", \\"universe\\"]));\\\\n    {\\\\n      const [target, index] = 𝛄.blockParams.default;\\\\n      χ.emitValue(χ.resolve(χ.Globals[\\"add\\"])({}, index, 1));\\\\n      χ.emitValue(χ.resolveOrReturn(𝚪.this.message)({}));\\\\n      χ.emitValue(χ.resolveOrReturn(target)({}));\\\\n    }\\\\n    χ.Globals[\\"each\\"];\\\\n  }\\\\n  𝚪; χ;\\\\n}) as unknown
        |
        | | Mapping: Identifier
        | |  hbs(0:0):
        | |  ts(343:354):  MyComponent
        | |
        | | Mapping: BlockStatement
        | |  hbs(0:123):   {{#each (array \\"world\\" \\"planet\\" \\"universe\\") as |target index|}}\\\\n  #{{add index 1}}: {{this.message}}, {{target}}!\\\\n{{/each}}
        | |  ts(424:790):  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"each\\"])({}, [\\"world\\", \\"planet\\", \\"universe\\"]));\\\\n    {\\\\n      const [target, index] = 𝛄.blockParams.default;\\\\n      χ.emitValue(χ.resolve(χ.Globals[\\"add\\"])({}, index, 1));\\\\n      χ.emitValue(χ.resolveOrReturn(𝚪.this.message)({}));\\\\n      χ.emitValue(χ.resolveOrReturn(target)({}));\\\\n    }\\\\n    χ.Globals[\\"each\\"];\\\\n  }
        | |
        | | | Mapping: PathExpression
        | | |  hbs(3:7):     each
        | | |  ts(469:486):  χ.Globals[\\"each\\"]
        | | |
        | | | | Mapping: Identifier
        | | | |  hbs(3:7):     each
        | | | |  ts(480:484):  each
        | | | |
        | | |
        | | | Mapping: SubExpression
        | | |  hbs(8:43):    (array \\"world\\" \\"planet\\" \\"universe\\")
        | | |  ts(492:523):  [\\"world\\", \\"planet\\", \\"universe\\"]
        | | |
        | | | | Mapping: StringLiteral
        | | | |  hbs(15:22):   \\"world\\"
        | | | |  ts(493:500):  \\"world\\"
        | | | |
        | | | | Mapping: StringLiteral
        | | | |  hbs(23:31):   \\"planet\\"
        | | | |  ts(502:510):  \\"planet\\"
        | | | |
        | | | | Mapping: StringLiteral
        | | | |  hbs(32:42):   \\"universe\\"
        | | | |  ts(512:522):  \\"universe\\"
        | | | |
        | | |
        | | | Mapping: Identifier
        | | |  hbs(48:54):   target
        | | |  ts(546:552):  target
        | | |
        | | | Mapping: Identifier
        | | |  hbs(55:60):   index
        | | |  ts(554:559):  index
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(67:82):   {{add index 1}}
        | | |  ts(587:647):  χ.emitValue(χ.resolve(χ.Globals[\\"add\\"])({}, index, 1))
        | | |
        | | | | Mapping: PathExpression
        | | | |  hbs(69:72):   add
        | | | |  ts(615:631):  χ.Globals[\\"add\\"]
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(69:72):   add
        | | | | |  ts(626:629):  add
        | | | | |
        | | | |
        | | | | Mapping: PathExpression
        | | | |  hbs(73:78):   index
        | | | |  ts(637:642):  index
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(73:78):   index
        | | | | |  ts(637:642):  index
        | | | | |
        | | | |
        | | | | Mapping: NumberLiteral
        | | | |  hbs(79:80):   1
        | | | |  ts(644:645):  1
        | | | |
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(84:100):  {{this.message}}
        | | |  ts(649:706):  χ.emitValue(χ.resolveOrReturn(𝚪.this.message)({}))
        | | |
        | | | | Mapping: PathExpression
        | | | |  hbs(86:98):   this.message
        | | | |  ts(685:700):  𝚪.this.message
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(86:90):   this
        | | | | |  ts(688:692):  this
        | | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(91:98):   message
        | | | | |  ts(693:700):  message
        | | | | |
        | | | |
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(102:112): {{target}}
        | | |  ts(708:756):  χ.emitValue(χ.resolveOrReturn(target)({}))
        | | |
        | | | | Mapping: PathExpression
        | | | |  hbs(104:110): target
        | | | |  ts(744:750):  target
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(104:110): target
        | | | | |  ts(744:750):  target
        | | | | |
        | | | |
        | | |
        | | | Mapping: Identifier
        | | |  hbs(117:121): each
        | | |  ts(779:783):  each
        | | |
        | |
        |"
      `);
    });

    test('inline template', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component, { hbs } from '@glint/environment-glimmerx/component';

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

      let transformedModule = rewriteModule({ script }, GlintEnvironment.load('glimmerx'));

      expect(transformedModule?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: Template
        |  hbs(169:219): hbs\`\\\\n    <HelperComponent @foo={{this.bar}} />\\\\n  \`
        |  ts(169:528):  ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {\\\\n  hbs;\\\\n  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }));\\\\n    𝛄;\\\\n  }\\\\n  𝚪; χ;\\\\n}) as unknown
        |
        | | Mapping: Identifier
        | |  hbs(169:169):
        | |  ts(323:334):  MyComponent
        | |
        | | Mapping: ElementNode
        | |  hbs(178:215): <HelperComponent @foo={{this.bar}} />
        | |  ts(408:506):  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }));\\\\n    𝛄;\\\\n  }
        | |
        | | | Mapping: Identifier
        | | |  hbs(179:194): HelperComponent
        | | |  ts(453:468):  HelperComponent
        | | |
        | | | Mapping: AttrNode
        | | |  hbs(195:212): @foo={{this.bar}}
        | | |  ts(472:488):  foo: 𝚪.this.bar
        | | |
        | | | | Mapping: Identifier
        | | | |  hbs(196:199): foo
        | | | |  ts(472:475):  foo
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(200:212): {{this.bar}}
        | | | |  ts(477:488):  𝚪.this.bar
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(202:210): this.bar
        | | | | |  ts(477:488):  𝚪.this.bar
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(202:206): this
        | | | | | |  ts(480:484):  this
        | | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(207:210): bar
        | | | | | |  ts(485:488):  bar
        | | | | | |
        | | | | |
        | | | |
        | | |
        | |
        |

        | Mapping: Template
        |  hbs(313:437): hbs\`\\\\n    <p ...attributes>\\\\n      Hello, {{@foo}}!\\\\n\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\n      {{@bar}}\\\\n    </p>\\\\n  \`
        |  ts(622:1086): ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<HelperComponent>, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {\\\\n  hbs;\\\\n  {\\\\n    const 𝛄 = χ.emitElement(\\"p\\");\\\\n    χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n    χ.emitValue(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n    χ.emitValue(χ.resolveOrReturn(𝚪.args.bar)({}));\\\\n  }\\\\n  𝚪; χ;\\\\n}) as unknown
        |
        | | Mapping: Identifier
        | |  hbs(313:313):
        | |  ts(776:791):  HelperComponent
        | |
        | | Mapping: ElementNode
        | |  hbs(322:433): <p ...attributes>\\\\n      Hello, {{@foo}}!\\\\n\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\n      {{@bar}}\\\\n    </p>
        | |  ts(865:1064): {\\\\n    const 𝛄 = χ.emitElement(\\"p\\");\\\\n    χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n    χ.emitValue(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n    χ.emitValue(χ.resolveOrReturn(𝚪.args.bar)({}));\\\\n  }
        | |
        | | | Mapping: AttrNode
        | | |  hbs(325:338): ...attributes
        | | |  ts(904:953):  χ.applySplattributes(𝚪.element, 𝛄.element);
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(353:361): {{@foo}}
        | | |  ts(954:1005): χ.emitValue(χ.resolveOrReturn(𝚪.args.foo)({}))
        | | |
        | | | | Mapping: PathExpression
        | | | |  hbs(355:359): @foo
        | | | |  ts(988:999):  𝚪.args.foo
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(356:359): foo
        | | | | |  ts(996:999):  foo
        | | | | |
        | | | |
        | | |
        | | | Mapping: MustacheCommentStatement
        | | |  hbs(370:409): {{! @glint-expect-error: no @bar arg }}
        | | |  ts(1007:1007):
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(416:424): {{@bar}}
        | | |  ts(1007:1058):χ.emitValue(χ.resolveOrReturn(𝚪.args.bar)({}))
        | | |
        | | | | Mapping: PathExpression
        | | | |  hbs(418:422): @bar
        | | | |  ts(1041:1052):𝚪.args.bar
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(419:422): bar
        | | | | |  ts(1049:1052):bar
        | | | | |
        | | | |
        | | |
        | |
        |"
      `);
    });
  });
});
