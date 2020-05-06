import { rewriteModule } from '../src';
import { stripIndent } from 'common-tags';

describe('Debug utilities', () => {
  test('TransformedModule#toDebugString', () => {
    let code = stripIndent`
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
    `;

    let transformedModule = rewriteModule('test.ts', code);

    expect(transformedModule?.toDebugString()).toMatchInlineSnapshot(`
      "TransformedModule test.ts

      | Mapping: Template
      |  hbs(0:50):    hbs\`\\\\n    <HelperComponent @foo={{this.bar}} />\\\\n  \`
      |  ts(0:248):    (() => {\\\\n  hbs;\\\\n  let χ!: typeof import(\\"@glint/template\\");\\\\n  return χ.template(function*(𝚪: import(\\"@glint/template\\").ResolveContext<MyComponent>) {\\\\n    yield χ.invokeBlock(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }), {});\\\\n    𝚪;\\\\n  });\\\\n})()
      | 
      | | Mapping: ElementNode
      | |  hbs(9:46):    <HelperComponent @foo={{this.bar}} />
      | |  ts(151:230):  yield χ.invokeBlock(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }), {});
      | | 
      | | | Mapping: ElementNode
      | | |  hbs(9:46):    <HelperComponent @foo={{this.bar}} />
      | | |  ts(151:230):  yield χ.invokeBlock(χ.resolve(HelperComponent)({ foo: 𝚪.this.bar }), {});
      | | | 
      | | | | Mapping: Identifier
      | | | |  hbs(10:25):   HelperComponent
      | | | |  ts(185:200):  HelperComponent
      | | | | 
      | | | | Mapping: AttrNode
      | | | |  hbs(26:43):   @foo={{this.bar}}
      | | | |  ts(204:220):  foo: 𝚪.this.bar
      | | | | 
      | | | | | Mapping: Identifier
      | | | | |  hbs(27:30):   foo
      | | | | |  ts(204:207):  foo
      | | | | | 
      | | | | | Mapping: MustacheStatement
      | | | | |  hbs(31:43):   {{this.bar}}
      | | | | |  ts(209:220):  𝚪.this.bar
      | | | | | 
      | | | | | | Mapping: PathExpression
      | | | | | |  hbs(33:41):   this.bar
      | | | | | |  ts(209:220):  𝚪.this.bar
      | | | | | | 
      | | | | | | | Mapping: Identifier
      | | | | | | |  hbs(33:37):   this
      | | | | | | |  ts(212:216):  this
      | | | | | | | 
      | | | | | | | Mapping: Identifier
      | | | | | | |  hbs(38:41):   bar
      | | | | | | |  ts(217:220):  bar
      | | | | | | | 
      | | | | | | 
      | | | | | 
      | | | | 
      | | | 
      | | 
      | 

      | Mapping: Template
      |  hbs(0:28):    hbs\`\\\\n    Hello, {{@foo}}\\\\n  \`
      |  ts(0:229):    (() => {\\\\n  hbs;\\\\n  let χ!: typeof import(\\"@glint/template\\");\\\\n  return χ.template(function*(𝚪: import(\\"@glint/template\\").ResolveContext<HelperComponent>) {\\\\n    χ.invokeInline(χ.resolveOrReturn(𝚪.args.foo)({}));\\\\n    𝚪;\\\\n  });\\\\n})()
      | 
      | | Mapping: MustacheStatement
      | |  hbs(16:24):   {{@foo}}
      | |  ts(155:209):  χ.invokeInline(χ.resolveOrReturn(𝚪.args.foo)({}))
      | | 
      | | | Mapping: PathExpression
      | | |  hbs(18:22):   @foo
      | | |  ts(192:203):  𝚪.args.foo
      | | | 
      | | | | Mapping: Identifier
      | | | |  hbs(19:22):   foo
      | | | |  ts(200:203):  foo
      | | | | 
      | | | 
      | | 
      | "
    `);
  });
});
