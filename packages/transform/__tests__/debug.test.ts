import { rewriteModule } from '../src';
import { stripIndent } from 'common-tags';
import { GlintEnvironment } from '@glint/config';

describe('Debug utilities', () => {
  test('TransformedModule#toDebugString', () => {
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
