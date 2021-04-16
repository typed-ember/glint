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
      |  hbs(0:50):    hbs\`\\\\n    <HelperComponent @foo={{this.bar}} />\\\\n  \`
      |  ts(0:324):    (() => {\\\\n  hbs;\\\\n  let χ!: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\");\\\\n  return χ.template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<MyComponent>) {\\\\n    {\\\\n      const 𝛄 = χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }));\\\\n      𝛄;\\\\n    }\\\\n    𝚪;\\\\n  });\\\\n})()
      |
      | | Mapping: Identifier
      | |  hbs(0:0):
      | |  ts(184:195):  MyComponent
      | |
      | | Mapping: ElementNode
      | |  hbs(9:46):    <HelperComponent @foo={{this.bar}} />
      | |  ts(200:306):  {\\\\n      const 𝛄 = χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }));\\\\n      𝛄;\\\\n    }
      | |
      | | | Mapping: Identifier
      | | |  hbs(10:25):   HelperComponent
      | | |  ts(249:264):  HelperComponent
      | | |
      | | | Mapping: AttrNode
      | | |  hbs(26:43):   @foo={{this.bar}}
      | | |  ts(268:284):  foo: 𝚪.this.bar
      | | |
      | | | | Mapping: Identifier
      | | | |  hbs(27:30):   foo
      | | | |  ts(268:271):  foo
      | | | |
      | | | | Mapping: MustacheStatement
      | | | |  hbs(31:43):   {{this.bar}}
      | | | |  ts(273:284):  𝚪.this.bar
      | | | |
      | | | | | Mapping: PathExpression
      | | | | |  hbs(33:41):   this.bar
      | | | | |  ts(273:284):  𝚪.this.bar
      | | | | |
      | | | | | | Mapping: Identifier
      | | | | | |  hbs(33:37):   this
      | | | | | |  ts(276:280):  this
      | | | | | |
      | | | | | | Mapping: Identifier
      | | | | | |  hbs(38:41):   bar
      | | | | | |  ts(281:284):  bar
      | | | | | |
      | | | | |
      | | | |
      | | |
      | |
      |

      | Mapping: Template
      |  hbs(0:124):   hbs\`\\\\n    <p ...attributes>\\\\n      Hello, {{@foo}}!\\\\n\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\n      {{@bar}}\\\\n    </p>\\\\n  \`
      |  ts(0:433):    (() => {\\\\n  hbs;\\\\n  let χ!: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\");\\\\n  return χ.template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<HelperComponent>) {\\\\n    {\\\\n      const 𝛄 = χ.emitElement(\\"p\\");\\\\n      χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n      χ.emitValue(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n      χ.emitValue(χ.resolveOrReturn(𝚪.args.bar)({}));\\\\n    }\\\\n    𝚪;\\\\n  });\\\\n})()
      |
      | | Mapping: Identifier
      | |  hbs(0:0):
      | |  ts(184:199):  HelperComponent
      | |
      | | Mapping: ElementNode
      | |  hbs(9:120):   <p ...attributes>\\\\n      Hello, {{@foo}}!\\\\n\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\n      {{@bar}}\\\\n    </p>
      | |  ts(204:415):  {\\\\n      const 𝛄 = χ.emitElement(\\"p\\");\\\\n      χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n      χ.emitValue(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n      χ.emitValue(χ.resolveOrReturn(𝚪.args.bar)({}));\\\\n    }
      | |
      | | | Mapping: AttrNode
      | | |  hbs(12:25):   ...attributes
      | | |  ts(247:298):  χ.applySplattributes(𝚪.element, 𝛄.element);
      | | |
      | | | Mapping: MustacheStatement
      | | |  hbs(40:48):   {{@foo}}
      | | |  ts(299:352):  χ.emitValue(χ.resolveOrReturn(𝚪.args.foo)({}))
      | | |
      | | | | Mapping: PathExpression
      | | | |  hbs(42:46):   @foo
      | | | |  ts(335:346):  𝚪.args.foo
      | | | |
      | | | | | Mapping: Identifier
      | | | | |  hbs(43:46):   foo
      | | | | |  ts(343:346):  foo
      | | | | |
      | | | |
      | | |
      | | | Mapping: MustacheCommentStatement
      | | |  hbs(57:96):   {{! @glint-expect-error: no @bar arg }}
      | | |  ts(354:354):
      | | |
      | | | Mapping: MustacheStatement
      | | |  hbs(103:111): {{@bar}}
      | | |  ts(354:407):  χ.emitValue(χ.resolveOrReturn(𝚪.args.bar)({}))
      | | |
      | | | | Mapping: PathExpression
      | | | |  hbs(105:109): @bar
      | | | |  ts(390:401):  𝚪.args.bar
      | | | |
      | | | | | Mapping: Identifier
      | | | | |  hbs(106:109): bar
      | | | | |  ts(398:401):  bar
      | | | | |
      | | | |
      | | |
      | |
      |"
    `);
  });
});
