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
        |  ts(622:1090): ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<HelperComponent>, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {\\\\n  hbs;\\\\n  {\\\\n    const 𝛄 = χ.emitElement(\\"p\\");\\\\n    χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)({}));\\\\n  }\\\\n  𝚪; χ;\\\\n}) as unknown
        |
        | | Mapping: Identifier
        | |  hbs(313:313):
        | |  ts(776:791):  HelperComponent
        | |
        | | Mapping: ElementNode
        | |  hbs(322:433): <p ...attributes>\\\\n      Hello, {{@foo}}!\\\\n\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\n      {{@bar}}\\\\n    </p>
        | |  ts(865:1068): {\\\\n    const 𝛄 = χ.emitElement(\\"p\\");\\\\n    χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)({}));\\\\n  }
        | |
        | | | Mapping: AttrNode
        | | |  hbs(325:338): ...attributes
        | | |  ts(904:953):  χ.applySplattributes(𝚪.element, 𝛄.element);
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(353:361): {{@foo}}
        | | |  ts(954:1007): χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)({}))
        | | |
        | | | | Mapping: PathExpression
        | | | |  hbs(355:359): @foo
        | | | |  ts(990:1001): 𝚪.args.foo
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(356:359): foo
        | | | | |  ts(998:1001): foo
        | | | | |
        | | | |
        | | |
        | | | Mapping: MustacheCommentStatement
        | | |  hbs(370:409): {{! @glint-expect-error: no @bar arg }}
        | | |  ts(1009:1009):
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(416:424): {{@bar}}
        | | |  ts(1009:1062):χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)({}))
        | | |
        | | | | Mapping: PathExpression
        | | | |  hbs(418:422): @bar
        | | | |  ts(1045:1056):𝚪.args.bar
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(419:422): bar
        | | | | |  ts(1053:1056):bar
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
        |  hbs(174:226): hbs\`\\\\r\\\\n    <HelperComponent @foo={{this.bar}} />\\\\r\\\\n  \`
        |  ts(174:533):  ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {\\\\n  hbs;\\\\n  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }));\\\\n    𝛄;\\\\n  }\\\\n  𝚪; χ;\\\\n}) as unknown
        |
        | | Mapping: Identifier
        | |  hbs(174:174):
        | |  ts(328:339):  MyComponent
        | |
        | | Mapping: ElementNode
        | |  hbs(184:221): <HelperComponent @foo={{this.bar}} />
        | |  ts(413:511):  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }));\\\\n    𝛄;\\\\n  }
        | |
        | | | Mapping: Identifier
        | | |  hbs(185:200): HelperComponent
        | | |  ts(458:473):  HelperComponent
        | | |
        | | | Mapping: AttrNode
        | | |  hbs(201:218): @foo={{this.bar}}
        | | |  ts(477:493):  foo: 𝚪.this.bar
        | | |
        | | | | Mapping: Identifier
        | | | |  hbs(202:205): foo
        | | | |  ts(477:480):  foo
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(206:218): {{this.bar}}
        | | | |  ts(482:493):  𝚪.this.bar
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(208:216): this.bar
        | | | | |  ts(482:493):  𝚪.this.bar
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(208:212): this
        | | | | | |  ts(485:489):  this
        | | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(213:216): bar
        | | | | | |  ts(490:493):  bar
        | | | | | |
        | | | | |
        | | | |
        | | |
        | |
        |

        | Mapping: Template
        |  hbs(324:455): hbs\`\\\\r\\\\n    <p ...attributes>\\\\r\\\\n      Hello, {{@foo}}!\\\\r\\\\n\\\\r\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\r\\\\n      {{@bar}}\\\\r\\\\n    </p>\\\\r\\\\n  \`
        |  ts(631:1099): ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<HelperComponent>, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {\\\\n  hbs;\\\\n  {\\\\n    const 𝛄 = χ.emitElement(\\"p\\");\\\\n    χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)({}));\\\\n  }\\\\n  𝚪; χ;\\\\n}) as unknown
        |
        | | Mapping: Identifier
        | |  hbs(324:324):
        | |  ts(785:800):  HelperComponent
        | |
        | | Mapping: ElementNode
        | |  hbs(334:450): <p ...attributes>\\\\r\\\\n      Hello, {{@foo}}!\\\\r\\\\n\\\\r\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\r\\\\n      {{@bar}}\\\\r\\\\n    </p>
        | |  ts(874:1077): {\\\\n    const 𝛄 = χ.emitElement(\\"p\\");\\\\n    χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n    χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)({}));\\\\n  }
        | |
        | | | Mapping: AttrNode
        | | |  hbs(337:350): ...attributes
        | | |  ts(913:962):  χ.applySplattributes(𝚪.element, 𝛄.element);
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(366:374): {{@foo}}
        | | |  ts(963:1016): χ.emitContent(χ.resolveOrReturn(𝚪.args.foo)({}))
        | | |
        | | | | Mapping: PathExpression
        | | | |  hbs(368:372): @foo
        | | | |  ts(999:1010): 𝚪.args.foo
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(369:372): foo
        | | | | |  ts(1007:1010):foo
        | | | | |
        | | | |
        | | |
        | | | Mapping: MustacheCommentStatement
        | | |  hbs(385:424): {{! @glint-expect-error: no @bar arg }}
        | | |  ts(1018:1018):
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(432:440): {{@bar}}
        | | |  ts(1018:1071):χ.emitContent(χ.resolveOrReturn(𝚪.args.bar)({}))
        | | |
        | | | | Mapping: PathExpression
        | | | |  hbs(434:438): @bar
        | | | |  ts(1054:1065):𝚪.args.bar
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(435:438): bar
        | | | | |  ts(1062:1065):bar
        | | | | |
        | | | |
        | | |
        | |
        |"
      `);
    });
  });
});
