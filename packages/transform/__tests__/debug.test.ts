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
      |  ts(0:344):    (() => {\\\\n  hbs;\\\\n  let χ!: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\");\\\\n  return χ.template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<MyComponent>) {\\\\n    χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }), 𝛄 => {\\\\n      χ.bindBlocks(𝛄.blockParams, {});\\\\n    });\\\\n    𝚪;\\\\n  });\\\\n})()
      |
      | | Mapping: Identifier
      | |  hbs(0:0):
      | |  ts(184:195):  MyComponent
      | |
      | | Mapping: ElementNode
      | |  hbs(9:46):    <HelperComponent @foo={{this.bar}} />
      | |  ts(200:326):  χ.emitComponent(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }), 𝛄 => {\\\\n      χ.bindBlocks(𝛄.blockParams, {});\\\\n    });
      | |
      | | | Mapping: Identifier
      | | |  hbs(10:25):   HelperComponent
      | | |  ts(230:245):  HelperComponent
      | | |
      | | | Mapping: AttrNode
      | | |  hbs(26:43):   @foo={{this.bar}}
      | | |  ts(249:265):  foo: 𝚪.this.bar
      | | |
      | | | | Mapping: Identifier
      | | | |  hbs(27:30):   foo
      | | | |  ts(249:252):  foo
      | | | |
      | | | | Mapping: MustacheStatement
      | | | |  hbs(31:43):   {{this.bar}}
      | | | |  ts(254:265):  𝚪.this.bar
      | | | |
      | | | | | Mapping: PathExpression
      | | | | |  hbs(33:41):   this.bar
      | | | | |  ts(254:265):  𝚪.this.bar
      | | | | |
      | | | | | | Mapping: Identifier
      | | | | | |  hbs(33:37):   this
      | | | | | |  ts(257:261):  this
      | | | | | |
      | | | | | | Mapping: Identifier
      | | | | | |  hbs(38:41):   bar
      | | | | | |  ts(262:265):  bar
      | | | | | |
      | | | | |
      | | | |
      | | |
      | |
      |

      | Mapping: Template
      |  hbs(0:62):    hbs\`\\\\n    <p ...attributes>\\\\n      Hello, {{@foo}}!\\\\n    </p>\\\\n  \`
      |  ts(0:368):    (() => {\\\\n  hbs;\\\\n  let χ!: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\");\\\\n  return χ.template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<HelperComponent>) {\\\\n    χ.emitElement(\\"p\\", 𝛄 => {\\\\n      χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n      χ.emitValue(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n    });\\\\n    𝚪;\\\\n  });\\\\n})()
      |
      | | Mapping: Identifier
      | |  hbs(0:0):
      | |  ts(184:199):  HelperComponent
      | |
      | | Mapping: ElementNode
      | |  hbs(9:58):    <p ...attributes>\\\\n      Hello, {{@foo}}!\\\\n    </p>
      | |  ts(204:350):  χ.emitElement(\\"p\\", 𝛄 => {\\\\n      χ.applySplattributes(𝚪.element, 𝛄.element);\\\\n      χ.emitValue(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n    });
      | |
      | | | Mapping: AttrNode
      | | |  hbs(12:25):   ...attributes
      | | |  ts(235:286):  χ.applySplattributes(𝚪.element, 𝛄.element);
      | | |
      | | | Mapping: MustacheStatement
      | | |  hbs(40:48):   {{@foo}}
      | | |  ts(287:340):  χ.emitValue(χ.resolveOrReturn(𝚪.args.foo)({}))
      | | |
      | | | | Mapping: PathExpression
      | | | |  hbs(42:46):   @foo
      | | | |  ts(323:334):  𝚪.args.foo
      | | | |
      | | | | | Mapping: Identifier
      | | | | |  hbs(43:46):   foo
      | | | | |  ts(331:334):  foo
      | | | | |
      | | | |
      | | |
      | |
      |"
    `);
  });
});
