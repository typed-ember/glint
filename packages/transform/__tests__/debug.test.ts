import { rewriteModule } from '../src';
import { stripIndent } from 'common-tags';
import { GlintEnvironment } from '@glint/config';

describe('Debug utilities', () => {
  test('TransformedModule#toDebugString', () => {
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

        class HelperComponent extends Component<{ foo: string }> {
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
      |  ts(0:277):    (() => {\\\\n  hbs;\\\\n  let χ!: typeof import(\\"@glint/environment-glimmerx/types\\");\\\\n  return χ.template(function(𝚪: import(\\"@glint/environment-glimmerx/types\\").ResolveContext<MyComponent>) {\\\\n    χ.invokeBlock(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }), {});\\\\n    𝚪;\\\\n  });\\\\n})()
      |
      | | Mapping: Identifier
      | |  hbs(0:0):
      | |  ts(170:181):  MyComponent
      | |
      | | Mapping: ElementNode
      | |  hbs(9:46):    <HelperComponent @foo={{this.bar}} />
      | |  ts(186:259):  χ.invokeBlock(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }), {});
      | |
      | | | Mapping: ElementNode
      | | |  hbs(9:46):    <HelperComponent @foo={{this.bar}} />
      | | |  ts(186:259):  χ.invokeBlock(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }), {});
      | | |
      | | | | Mapping: Identifier
      | | | |  hbs(10:25):   HelperComponent
      | | | |  ts(214:229):  HelperComponent
      | | | |
      | | | | Mapping: AttrNode
      | | | |  hbs(26:43):   @foo={{this.bar}}
      | | | |  ts(233:249):  foo: 𝚪.this.bar
      | | | |
      | | | | | Mapping: Identifier
      | | | | |  hbs(27:30):   foo
      | | | | |  ts(233:236):  foo
      | | | | |
      | | | | | Mapping: MustacheStatement
      | | | | |  hbs(31:43):   {{this.bar}}
      | | | | |  ts(238:249):  𝚪.this.bar
      | | | | |
      | | | | | | Mapping: PathExpression
      | | | | | |  hbs(33:41):   this.bar
      | | | | | |  ts(238:249):  𝚪.this.bar
      | | | | | |
      | | | | | | | Mapping: Identifier
      | | | | | | |  hbs(33:37):   this
      | | | | | | |  ts(241:245):  this
      | | | | | | |
      | | | | | | | Mapping: Identifier
      | | | | | | |  hbs(38:41):   bar
      | | | | | | |  ts(246:249):  bar
      | | | | | | |
      | | | | | |
      | | | | |
      | | | |
      | | |
      | |
      |

      | Mapping: Template
      |  hbs(0:28):    hbs\`\\\\n    Hello, {{@foo}}\\\\n  \`
      |  ts(0:262):    (() => {\\\\n  hbs;\\\\n  let χ!: typeof import(\\"@glint/environment-glimmerx/types\\");\\\\n  return χ.template(function(𝚪: import(\\"@glint/environment-glimmerx/types\\").ResolveContext<HelperComponent>) {\\\\n    χ.invokeEmit(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n    𝚪;\\\\n  });\\\\n})()
      |
      | | Mapping: Identifier
      | |  hbs(0:0):
      | |  ts(170:185):  HelperComponent
      | |
      | | Mapping: MustacheStatement
      | |  hbs(16:24):   {{@foo}}
      | |  ts(190:242):  χ.invokeEmit(χ.resolveOrReturn(𝚪.args.foo)({}))
      | |
      | | | Mapping: PathExpression
      | | |  hbs(18:22):   @foo
      | | |  ts(225:236):  𝚪.args.foo
      | | |
      | | | | Mapping: Identifier
      | | | |  hbs(19:22):   foo
      | | | |  ts(233:236):  foo
      | | | |
      | | |
      | |
      |"
    `);
  });
});
