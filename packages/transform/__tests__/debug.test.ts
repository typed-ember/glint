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
            Hello, {{@foo}}
          \`;
        }
      `,
    };

    let transformedModule = rewriteModule({ script }, GlintEnvironment.load('glimmerx'));

    expect(transformedModule?.toDebugString()).toMatchInlineSnapshot(`
      "TransformedModule

      | Mapping: Template
      |  hbs(0:50):    hbs\`\\\\n    <HelperComponent @foo={{this.bar}} />\\\\n  \`
      |  ts(0:291):    (() => {\\\\n  hbs;\\\\n  let χ!: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\");\\\\n  return χ.template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<MyComponent>) {\\\\n    χ.invokeBlock(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }), {});\\\\n    𝚪;\\\\n  });\\\\n})()
      |
      | | Mapping: Identifier
      | |  hbs(0:0):
      | |  ts(184:195):  MyComponent
      | |
      | | Mapping: ElementNode
      | |  hbs(9:46):    <HelperComponent @foo={{this.bar}} />
      | |  ts(200:273):  χ.invokeBlock(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }), {});
      | |
      | | | Mapping: ElementNode
      | | |  hbs(9:46):    <HelperComponent @foo={{this.bar}} />
      | | |  ts(200:273):  χ.invokeBlock(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }), {});
      | | |
      | | | | Mapping: Identifier
      | | | |  hbs(10:25):   HelperComponent
      | | | |  ts(228:243):  HelperComponent
      | | | |
      | | | | Mapping: AttrNode
      | | | |  hbs(26:43):   @foo={{this.bar}}
      | | | |  ts(247:263):  foo: 𝚪.this.bar
      | | | |
      | | | | | Mapping: Identifier
      | | | | |  hbs(27:30):   foo
      | | | | |  ts(247:250):  foo
      | | | | |
      | | | | | Mapping: MustacheStatement
      | | | | |  hbs(31:43):   {{this.bar}}
      | | | | |  ts(252:263):  𝚪.this.bar
      | | | | |
      | | | | | | Mapping: PathExpression
      | | | | | |  hbs(33:41):   this.bar
      | | | | | |  ts(252:263):  𝚪.this.bar
      | | | | | |
      | | | | | | | Mapping: Identifier
      | | | | | | |  hbs(33:37):   this
      | | | | | | |  ts(255:259):  this
      | | | | | | |
      | | | | | | | Mapping: Identifier
      | | | | | | |  hbs(38:41):   bar
      | | | | | | |  ts(260:263):  bar
      | | | | | | |
      | | | | | |
      | | | | |
      | | | |
      | | |
      | |
      |

      | Mapping: Template
      |  hbs(0:28):    hbs\`\\\\n    Hello, {{@foo}}\\\\n  \`
      |  ts(0:276):    (() => {\\\\n  hbs;\\\\n  let χ!: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\");\\\\n  return χ.template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<HelperComponent>) {\\\\n    χ.emitValue(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n    𝚪;\\\\n  });\\\\n})()
      |
      | | Mapping: Identifier
      | |  hbs(0:0):
      | |  ts(184:199):  HelperComponent
      | |
      | | Mapping: MustacheStatement
      | |  hbs(16:24):   {{@foo}}
      | |  ts(204:256):  χ.emitValue(χ.resolveOrReturn(𝚪.args.foo)({}))
      | |
      | | | Mapping: PathExpression
      | | |  hbs(18:22):   @foo
      | | |  ts(239:250):  𝚪.args.foo
      | | |
      | | | | Mapping: Identifier
      | | | |  hbs(19:22):   foo
      | | | |  ts(247:250):  foo
      | | | |
      | | |
      | |
      |"
    `);
  });
});
