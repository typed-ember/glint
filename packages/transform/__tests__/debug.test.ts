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
      |  ts(0:359):    ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {\\\\n  hbs;\\\\n  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }));\\\\n    𝛄;\\\\n  }\\\\n  𝚪; χ;\\\\n}) as unknown
      |
      | | Mapping: Identifier
      | |  hbs(0:0):
      | |  ts(154:165):  MyComponent
      | |
      | | Mapping: ElementNode
      | |  hbs(9:46):    <HelperComponent @foo={{this.bar}} />
      | |  ts(239:337):  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }));\\\\n    𝛄;\\\\n  }
      | |
      | | | Mapping: Identifier
      | | |  hbs(10:25):   HelperComponent
      | | |  ts(284:299):  HelperComponent
      | | |
      | | | Mapping: AttrNode
      | | |  hbs(26:43):   @foo={{this.bar}}
      | | |  ts(303:319):  foo: 𝚪.this.bar
      | | |
      | | | | Mapping: Identifier
      | | | |  hbs(27:30):   foo
      | | | |  ts(303:306):  foo
      | | | |
      | | | | Mapping: MustacheStatement
      | | | |  hbs(31:43):   {{this.bar}}
      | | | |  ts(308:319):  𝚪.this.bar
      | | | |
      | | | | | Mapping: PathExpression
      | | | | |  hbs(33:41):   this.bar
      | | | | |  ts(308:319):  𝚪.this.bar
      | | | | |
      | | | | | | Mapping: Identifier
      | | | | | |  hbs(33:37):   this
      | | | | | |  ts(311:315):  this
      | | | | | |
      | | | | | | Mapping: Identifier
      | | | | | |  hbs(38:41):   bar
      | | | | | |  ts(316:319):  bar
      | | | | | |
      | | | | |
      | | | |
      | | |
      | |
      |

      | Mapping: Template
      |  hbs(0:124):   hbs\`\\\\n    <p ...attributes>\\\\n      Hello, {{@foo}}!\\\\n\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\n      {{@bar}}\\\\n    </p>\\\\n  \`
      |  ts(0:464):    ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<HelperComponent>, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {\\\\n  hbs;\\\\n  {\\\\n    const 𝛄 = χ.emitElement(\\"p\\");\\\\n    χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n    χ.emitValue(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n    χ.emitValue(χ.resolveOrReturn(𝚪.args.bar)({}));\\\\n  }\\\\n  𝚪; χ;\\\\n}) as unknown
      |
      | | Mapping: Identifier
      | |  hbs(0:0):
      | |  ts(154:169):  HelperComponent
      | |
      | | Mapping: ElementNode
      | |  hbs(9:120):   <p ...attributes>\\\\n      Hello, {{@foo}}!\\\\n\\\\n      {{! @glint-expect-error: no @bar arg }}\\\\n      {{@bar}}\\\\n    </p>
      | |  ts(243:442):  {\\\\n    const 𝛄 = χ.emitElement(\\"p\\");\\\\n    χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n    χ.emitValue(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n    χ.emitValue(χ.resolveOrReturn(𝚪.args.bar)({}));\\\\n  }
      | |
      | | | Mapping: AttrNode
      | | |  hbs(12:25):   ...attributes
      | | |  ts(282:331):  χ.applySplattributes(𝚪.element, 𝛄.element);
      | | |
      | | | Mapping: MustacheStatement
      | | |  hbs(40:48):   {{@foo}}
      | | |  ts(332:383):  χ.emitValue(χ.resolveOrReturn(𝚪.args.foo)({}))
      | | |
      | | | | Mapping: PathExpression
      | | | |  hbs(42:46):   @foo
      | | | |  ts(366:377):  𝚪.args.foo
      | | | |
      | | | | | Mapping: Identifier
      | | | | |  hbs(43:46):   foo
      | | | | |  ts(374:377):  foo
      | | | | |
      | | | |
      | | |
      | | | Mapping: MustacheCommentStatement
      | | |  hbs(57:96):   {{! @glint-expect-error: no @bar arg }}
      | | |  ts(385:385):
      | | |
      | | | Mapping: MustacheStatement
      | | |  hbs(103:111): {{@bar}}
      | | |  ts(385:436):  χ.emitValue(χ.resolveOrReturn(𝚪.args.bar)({}))
      | | |
      | | | | Mapping: PathExpression
      | | | |  hbs(105:109): @bar
      | | | |  ts(419:430):  𝚪.args.bar
      | | | |
      | | | | | Mapping: Identifier
      | | | | |  hbs(106:109): bar
      | | | | |  ts(427:430):  bar
      | | | | |
      | | | |
      | | |
      | |
      |"
    `);
  });
});
