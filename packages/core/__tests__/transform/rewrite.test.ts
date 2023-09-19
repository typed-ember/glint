import ts from 'typescript';
import { describe, test, expect } from 'vitest';
import { rewriteModule } from '../../src/transform/index.js';
import { stripIndent } from 'common-tags';
import { GlintEnvironment } from '../../src/config/index.js';

describe('Transform: rewriteModule', () => {
  describe('inline tagged template', () => {
    const glimmerxEnvironment = GlintEnvironment.load('glimmerx');

    test('with a simple class', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component, { hbs } from '@glimmerx/component';
          export default class MyComponent extends Component {
            static template = hbs\`\`;
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, glimmerxEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component, { hbs } from '@glimmerx/component';
        export default class MyComponent extends Component {
          static template = ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).templateForBackingValue(this, function(𝚪, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {
          hbs;
          𝚪; χ;
        });
        }"
      `);
    });

    test('with a class with type parameters', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component, { hbs } from '@glimmerx/component';
          export default class MyComponent<K extends string> extends Component<{ value: K }> {
            static template = hbs\`\`;
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, glimmerxEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component, { hbs } from '@glimmerx/component';
        export default class MyComponent<K extends string> extends Component<{ value: K }> {
          static template = ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).templateForBackingValue(this, function(𝚪, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {
          hbs;
          𝚪; χ;
        });
        }"
      `);
    });

    test('with an anonymous class', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component, { hbs } from '@glimmerx/component';
          export default class extends Component {
            static template = hbs\`\`;
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, glimmerxEnvironment);

      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component, { hbs } from '@glimmerx/component';
        export default class extends Component {
          static template = ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).templateForBackingValue(this, function(𝚪, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {
          hbs;
          𝚪; χ;
        });
        }"
      `);
    });

    test('with a syntax error', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component, { hbs } from '@glimmerx/component';
          export default class MyComponent extends Component {
            static template = hbs\`
              {{hello
            \`;
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, glimmerxEnvironment);

      expect(transformedModule?.errors.length).toBe(1);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component, { hbs } from '@glimmerx/component';
        export default class MyComponent extends Component {
          static template = ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).templateForBackingValue(this, function(𝚪, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {
          hbs;
          𝚪; χ;
        });
        }"
      `);
    });

    test('outer variable capture', () => {
      let testEnvironment = new GlintEnvironment(['test'], {
        tags: {
          '@glint/test-env': {
            hbsCaptureAll: { typesModule: '@glint/test-env', globals: [] },
            hbsCaptureSome: { typesModule: '@glint/test-env', globals: ['global'] },
            hbsCaptureNone: { typesModule: '@glint/test-env' },
          },
        },
      });

      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import { hbsCaptureAll, hbsCaptureSome, hbsCaptureNone } from '@glint/test-env';

          const message = 'hello';

          hbsCaptureAll\`{{global}} {{message}}\`;
          hbsCaptureSome\`{{global}} {{message}}\`;
          hbsCaptureNone\`{{global}} {{message}}\`;
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, testEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import { hbsCaptureAll, hbsCaptureSome, hbsCaptureNone } from '@glint/test-env';

        const message = 'hello';

        ({} as typeof import(\\"@glint/test-env\\")).templateExpression(function(𝚪, χ: typeof import(\\"@glint/test-env\\")) {
          hbsCaptureAll;
          χ.emitContent(χ.resolveOrReturn(global)());
          χ.emitContent(χ.resolveOrReturn(message)());
          𝚪; χ;
        });
        ({} as typeof import(\\"@glint/test-env\\")).templateExpression(function(𝚪, χ: typeof import(\\"@glint/test-env\\")) {
          hbsCaptureSome;
          χ.emitContent(χ.resolveOrReturn(χ.Globals[\\"global\\"])());
          χ.emitContent(χ.resolveOrReturn(message)());
          𝚪; χ;
        });
        ({} as typeof import(\\"@glint/test-env\\")).templateExpression(function(𝚪, χ: typeof import(\\"@glint/test-env\\")) {
          hbsCaptureNone;
          χ.emitContent(χ.resolveOrReturn(χ.Globals[\\"global\\"])());
          χ.emitContent(χ.resolveOrReturn(χ.Globals[\\"message\\"])());
          𝚪; χ;
        });"
      `);
    });
  });

  describe('standalone companion template', () => {
    const emberLooseEnvironment = GlintEnvironment.load(`ember-loose`);

    test('with a simple class', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class MyComponent extends Component {
          }
        `,
      };

      let template = {
        filename: 'test.hbs',
        contents: stripIndent``,
      };

      let transformedModule = rewriteModule(ts, { script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent extends Component {
        static {
        ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).templateForBackingValue(this, function(𝚪, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          𝚪; χ;
        })}
        }"
      `);
    });

    test('with a class that is separately exported', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          class MyComponent extends Component {
          }
          export default MyComponent;
        `,
      };

      let template = {
        filename: 'test.hbs',
        contents: stripIndent``,
      };

      let transformedModule = rewriteModule(ts, { script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        class MyComponent extends Component {
        static {
        ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).templateForBackingValue(this, function(𝚪, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          𝚪; χ;
        })}
        }
        export default MyComponent;"
      `);
    });

    test('with a class with type parameters', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class MyComponent<K extends string> extends Component<{ value: K }> {
          }
        `,
      };

      let template = {
        filename: 'test.hbs',
        contents: stripIndent``,
      };

      let transformedModule = rewriteModule(ts, { script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent<K extends string> extends Component<{ value: K }> {
        static {
        ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).templateForBackingValue(this, function(𝚪, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          𝚪; χ;
        })}
        }"
      `);
    });

    test('with an anonymous class', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class extends Component {
          }
        `,
      };

      let template = {
        filename: 'test.hbs',
        contents: stripIndent``,
      };

      let transformedModule = rewriteModule(ts, { script, template }, emberLooseEnvironment);

      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class extends Component {
        static {
        ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).templateForBackingValue(this, function(𝚪, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          𝚪; χ;
        })}
        }"
      `);
    });

    test('with no default export', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export class MyComponent extends Component {}
        `,
      };

      let template = {
        filename: 'test.hbs',
        contents: stripIndent`{{hello}}`,
      };

      let transformedModule = rewriteModule(ts, { script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export class MyComponent extends Component {}
        ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).templateExpression(function(𝚪, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          χ.emitContent(χ.resolveOrReturn(χ.Globals[\\"hello\\"])());
          𝚪; χ;
        });
        "
      `);
    });

    test('with an opaque default export', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import templateOnly from '@glimmer/component/template-only';

          export default templateOnly();
        `,
      };

      let template = {
        filename: 'test.hbs',
        contents: stripIndent``,
      };

      let transformedModule = rewriteModule(ts, { script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import templateOnly from '@glimmer/component/template-only';

        export default templateOnly();
        ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).templateForBackingValue(({} as unknown as typeof import('./test').default), function(𝚪, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          𝚪; χ;
        });
        "
      `);
    });

    test('with an opaque default export from JS file', () => {
      let script = {
        filename: 'test.js',
        contents: stripIndent`
          import templateOnly from '@glimmer/component/template-only';

          export default templateOnly();
        `,
      };

      let template = {
        filename: 'test.hbs',
        contents: stripIndent``,
      };

      let transformedModule = rewriteModule(ts, { script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import templateOnly from '@glimmer/component/template-only';

        export default templateOnly();
        (/** @type {typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")} */ ({})).templateForBackingValue((/** @type {typeof import('./test').default} */ ({})), function(𝚪, /** @type {typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")} */ χ) {
          𝚪; χ;
        });
        "
      `);
    });

    test('with an unresolvable default export', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          export default Foo;
        `,
      };

      let template = {
        filename: 'test.hbs',
        contents: stripIndent`{{hello}}`,
      };

      let transformedModule = rewriteModule(ts, { script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "export default Foo;
        ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).templateForBackingValue(({} as unknown as typeof import('./test').default), function(𝚪, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          χ.emitContent(χ.resolveOrReturn(χ.Globals[\\"hello\\"])());
          𝚪; χ;
        });
        "
      `);
    });

    test('with a class with default export in module augmentation', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class MyComponent extends Component {
          }
          declare module '@glint/environment-ember-loose/registry' {
            export default interface Registry {
              Test: MyComponent;
            }
          }
        `,
      };

      let template = {
        filename: 'test.hbs',
        contents: stripIndent``,
      };

      let transformedModule = rewriteModule(ts, { script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent extends Component {
        static {
        ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).templateForBackingValue(this, function(𝚪, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          𝚪; χ;
        })}
        }
        declare module '@glint/environment-ember-loose/registry' {
          export default interface Registry {
            Test: MyComponent;
          }
        }"
      `);
    });

    test('with a syntax error', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class MyComponent extends Component {
          }
        `,
      };

      let template = {
        filename: 'test.hbs',
        contents: stripIndent`
          {{hello
        `,
      };

      let transformedModule = rewriteModule(ts, { script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors.length).toBe(1);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent extends Component {
        static {
        ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).templateForBackingValue(this, function(𝚪, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          𝚪; χ;
        })}
        }"
      `);
    });
  });

  describe('ember-template-imports', () => {
    test('embedded gts templates', () => {
      let customEnv = GlintEnvironment.load(['ember-loose', 'ember-template-imports']);
      let script = {
        filename: 'foo.gts',
        contents: stripIndent`
          class MyComponent {
            <template>
              Hello, {{this.target}}!
            </template>

            private target = 'World';
          }
        `,
      };

      let rewritten = rewriteModule(ts, { script }, customEnv);
      let roundTripOffset = (offset: number): number | undefined =>
        rewritten?.getOriginalOffset(rewritten.getTransformedOffset(script.filename, offset))
          .offset;

      let classOffset = script.contents.indexOf('MyComponent');
      let accessOffset = script.contents.indexOf('this.target');
      let fieldOffset = script.contents.indexOf('private target');

      expect(roundTripOffset(classOffset)).toEqual(classOffset);
      expect(roundTripOffset(accessOffset)).toEqual(accessOffset);
      expect(roundTripOffset(fieldOffset)).toEqual(fieldOffset);

      expect(rewritten?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: TemplateEmbedding
        |  in: hbs(22:74):    <template>\\\\n    Hello, {{this.target}}!\\\\n  </template>
        |  out: ts(22:299):   static { ({} as typeof import(\\"@glint/environment-ember-template-imports/-private/dsl\\")).templateForBackingValue(this, function(𝚪, χ: typeof import(\\"@glint/environment-ember-template-imports/-private/dsl\\")) {\\\\n  χ.emitContent(χ.resolveOrReturn(𝚪.this.target)());\\\\n  𝚪; χ;\\\\n}) }
        |
        | | Mapping: Template
        | |  in: hbs(32:63):    Hello, {{this.target}}!
        | |  out: ts(232:286):  χ.emitContent(χ.resolveOrReturn(𝚪.this.target)());
        | |
        | | | Mapping: TextContent
        | | |  in: hbs(37:43):    Hello,
        | | |  out: ts(232:232):
        | | |
        | | | Mapping: MustacheStatement
        | | |  in: hbs(44:59):    {{this.target}}
        | | |  out: ts(232:284):  χ.emitContent(χ.resolveOrReturn(𝚪.this.target)())
        | | |
        | | | | Mapping: PathExpression
        | | | |  in: hbs(46:57):    this.target
        | | | |  out: ts(266:280):  𝚪.this.target
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  in: hbs(46:50):    this
        | | | | |  out: ts(269:273):  this
        | | | | |
        | | | | | Mapping: Identifier
        | | | | |  in: hbs(51:57):    target
        | | | | |  out: ts(274:280):  target
        | | | | |
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  in: hbs(59:60):    !
        | | |  out: ts(286:286):
        | | |
        | |
        |"
      `);
    });

    test('implicit default export', () => {
      let customEnv = GlintEnvironment.load(['ember-loose', 'ember-template-imports']);
      let script = {
        filename: 'foo.gts',
        contents: stripIndent`
          <template>
            Hello, {{@target}}!
          </template>
        `,
      };

      expect(rewriteModule(ts, { script }, customEnv)?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: TemplateEmbedding
        |  in: hbs(0:44):     <template>\\\\n  Hello, {{@target}}!\\\\n</template>
        |  out: ts(0:270):    export default ({} as typeof import(\\"@glint/environment-ember-template-imports/-private/dsl\\")).templateExpression(function(𝚪, χ: typeof import(\\"@glint/environment-ember-template-imports/-private/dsl\\")) {\\\\n  χ.emitContent(χ.resolveOrReturn(𝚪.args.target)());\\\\n  𝚪; χ;\\\\n})
        |
        | | Mapping: Template
        | |  in: hbs(10:33):    Hello, {{@target}}!
        | |  out: ts(205:259):  χ.emitContent(χ.resolveOrReturn(𝚪.args.target)());
        | |
        | | | Mapping: TextContent
        | | |  in: hbs(13:19):    Hello,
        | | |  out: ts(205:205):
        | | |
        | | | Mapping: MustacheStatement
        | | |  in: hbs(20:31):    {{@target}}
        | | |  out: ts(205:257):  χ.emitContent(χ.resolveOrReturn(𝚪.args.target)())
        | | |
        | | | | Mapping: PathExpression
        | | | |  in: hbs(22:29):    @target
        | | | |  out: ts(239:253):  𝚪.args.target
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  in: hbs(23:29):    target
        | | | | |  out: ts(247:253):  target
        | | | | |
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  in: hbs(31:32):    !
        | | |  out: ts(259:259):
        | | |
        | |
        |"
      `);
    });

    test('mixed expression and class uses', () => {
      let customEnv = GlintEnvironment.load(['ember-loose', 'ember-template-imports']);
      let script = {
        filename: 'foo.gts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          console.log(<template>{{@message}}</template>);
          export class MyComponent extends Component {
            <template>{{this.title}}</template>
          }
        `,
      };

      let rewritten = rewriteModule(ts, { script }, customEnv);
      let roundTripOffset = (offset: number): number | undefined =>
        rewritten?.getOriginalOffset(rewritten.getTransformedOffset(script.filename, offset))
          .offset;

      let classOffset = script.contents.indexOf('MyComponent');
      let firstTemplateOffset = script.contents.indexOf('@message');
      let secondTemplateOffset = script.contents.indexOf('this.title');

      expect(roundTripOffset(classOffset)).toEqual(classOffset);
      expect(roundTripOffset(firstTemplateOffset)).toEqual(firstTemplateOffset);
      expect(roundTripOffset(secondTemplateOffset)).toEqual(secondTemplateOffset);

      expect(rewritten?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: TemplateEmbedding
        |  in: hbs(56:89):    <template>{{@message}}</template>
        |  out: ts(56:312):   ({} as typeof import(\\"@glint/environment-ember-template-imports/-private/dsl\\")).templateExpression(function(𝚪, χ: typeof import(\\"@glint/environment-ember-template-imports/-private/dsl\\")) {\\\\n  χ.emitContent(χ.resolveOrReturn(𝚪.args.message)());\\\\n  𝚪; χ;\\\\n})
        |
        | | Mapping: Template
        | |  in: hbs(66:78):    {{@message}}
        | |  out: ts(246:301):  χ.emitContent(χ.resolveOrReturn(𝚪.args.message)());
        | |
        | | | Mapping: MustacheStatement
        | | |  in: hbs(66:78):    {{@message}}
        | | |  out: ts(246:299):  χ.emitContent(χ.resolveOrReturn(𝚪.args.message)())
        | | |
        | | | | Mapping: PathExpression
        | | | |  in: hbs(68:76):    @message
        | | | |  out: ts(280:295):  𝚪.args.message
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  in: hbs(69:76):    message
        | | | | |  out: ts(288:295):  message
        | | | | |
        | | | |
        | | |
        | |
        |

        | Mapping: TemplateEmbedding
        |  in: hbs(139:174):  <template>{{this.title}}</template>
        |  out: ts(362:638):  static { ({} as typeof import(\\"@glint/environment-ember-template-imports/-private/dsl\\")).templateForBackingValue(this, function(𝚪, χ: typeof import(\\"@glint/environment-ember-template-imports/-private/dsl\\")) {\\\\n  χ.emitContent(χ.resolveOrReturn(𝚪.this.title)());\\\\n  𝚪; χ;\\\\n}) }
        |
        | | Mapping: Template
        | |  in: hbs(149:163):  {{this.title}}
        | |  out: ts(572:625):  χ.emitContent(χ.resolveOrReturn(𝚪.this.title)());
        | |
        | | | Mapping: MustacheStatement
        | | |  in: hbs(149:163):  {{this.title}}
        | | |  out: ts(572:623):  χ.emitContent(χ.resolveOrReturn(𝚪.this.title)())
        | | |
        | | | | Mapping: PathExpression
        | | | |  in: hbs(151:161):  this.title
        | | | |  out: ts(606:619):  𝚪.this.title
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  in: hbs(151:155):  this
        | | | | |  out: ts(609:613):  this
        | | | | |
        | | | | | Mapping: Identifier
        | | | | |  in: hbs(156:161):  title
        | | | | |  out: ts(614:619):  title
        | | | | |
        | | | |
        | | |
        | |
        |"
      `);
    });

    test('with imported special forms', () => {
      let env = GlintEnvironment.load(['ember-loose', 'ember-template-imports']);
      let script = {
        filename: 'foo.gts',
        contents: stripIndent`
          import { array as arr, hash as h } from '@ember/helper';
          import AnotherComponent from './another.gts';

          <template>
            {{! Intentionally shadowing }}
            {{#let (arr 1 2) (h red="blue") as |arr h|}}
              Array is {{arr}}
              Hash is {{h}}
            {{/let}}
            <Another />
          </template>
        `,
      };

      expect(rewriteModule(ts, { script }, env)?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: GtsImport
        |  in: ts(57:102):    import AnotherComponent from './another.gts';
        |  out: ts(57:101):   import AnotherComponent from \\"./another.ts\\";
        |

        | Mapping: TemplateEmbedding
        |  in: hbs(104:270):  <template>\\\\n  {{! Intentionally shadowing }}\\\\n  {{#let (arr 1 2) (h red=\\"blue\\") as |arr h|}}\\\\n    Array is {{arr}}\\\\n    Hash is {{h}}\\\\n  {{/let}}\\\\n  <Another />\\\\n</template>
        |  out: ts(103:700):  export default ({} as typeof import(\\"@glint/environment-ember-template-imports/-private/dsl\\")).templateExpression(function(𝚪, χ: typeof import(\\"@glint/environment-ember-template-imports/-private/dsl\\")) {\\\\n  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"let\\"])((χ.noop(arr), [1, 2]), (χ.noop(h), ({\\\\n      red: \\"blue\\",\\\\n    }))));\\\\n    {\\\\n      const [arr, h] = 𝛄.blockParams[\\"default\\"];\\\\n      χ.emitContent(χ.resolveOrReturn(arr)());\\\\n      χ.emitContent(χ.resolveOrReturn(h)());\\\\n    }\\\\n    χ.Globals[\\"let\\"];\\\\n  }\\\\n  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(Another)());\\\\n    𝛄;\\\\n  }\\\\n  𝚪; χ;\\\\n})
        |
        | | Mapping: Template
        | |  in: hbs(114:259):  {{! Intentionally shadowing }}\\\\n  {{#let (arr 1 2) (h red=\\"blue\\") as |arr h|}}\\\\n    Array is {{arr}}\\\\n    Hash is {{h}}\\\\n  {{/let}}\\\\n  <Another />
        | |  out: ts(308:689):  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"let\\"])((χ.noop(arr), [1, 2]), (χ.noop(h), ({\\\\n      red: \\"blue\\",\\\\n    }))));\\\\n    {\\\\n      const [arr, h] = 𝛄.blockParams[\\"default\\"];\\\\n      χ.emitContent(χ.resolveOrReturn(arr)());\\\\n      χ.emitContent(χ.resolveOrReturn(h)());\\\\n    }\\\\n    χ.Globals[\\"let\\"];\\\\n  }\\\\n  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(Another)());\\\\n    𝛄;\\\\n  }
        | |
        | | | Mapping: TextContent
        | | |  in: hbs(114:115):
        | | |  out: ts(308:308):
        | | |
        | | | Mapping: MustacheCommentStatement
        | | |  in: hbs(117:147):  {{! Intentionally shadowing }}
        | | |  out: ts(308:308):
        | | |
        | | | Mapping: BlockStatement
        | | |  in: hbs(150:244):  {{#let (arr 1 2) (h red=\\"blue\\") as |arr h|}}\\\\n    Array is {{arr}}\\\\n    Hash is {{h}}\\\\n  {{/let}}
        | | |  out: ts(308:618):  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"let\\"])((χ.noop(arr), [1, 2]), (χ.noop(h), ({\\\\n      red: \\"blue\\",\\\\n    }))));\\\\n    {\\\\n      const [arr, h] = 𝛄.blockParams[\\"default\\"];\\\\n      χ.emitContent(χ.resolveOrReturn(arr)());\\\\n      χ.emitContent(χ.resolveOrReturn(h)());\\\\n    }\\\\n    χ.Globals[\\"let\\"];\\\\n  }
        | | |
        | | | | Mapping: PathExpression
        | | | |  in: hbs(153:156):  let
        | | | |  out: ts(353:369):  χ.Globals[\\"let\\"]
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  in: hbs(153:156):  let
        | | | | |  out: ts(364:367):  let
        | | | | |
        | | | |
        | | | | Mapping: PathExpression
        | | | |  in: hbs(158:161):  arr
        | | | |  out: ts(379:382):  arr
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  in: hbs(158:161):  arr
        | | | | |  out: ts(379:382):  arr
        | | | | |
        | | | |
        | | | | Mapping: SubExpression
        | | | |  in: hbs(157:166):  (arr 1 2)
        | | | |  out: ts(385:391):  [1, 2]
        | | | |
        | | | | | Mapping: NumberLiteral
        | | | | |  in: hbs(162:163):  1
        | | | | |  out: ts(386:387):  1
        | | | | |
        | | | | | Mapping: NumberLiteral
        | | | | |  in: hbs(164:165):  2
        | | | | |  out: ts(389:390):  2
        | | | | |
        | | | |
        | | | | Mapping: PathExpression
        | | | |  in: hbs(168:169):  h
        | | | |  out: ts(402:403):  h
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  in: hbs(168:169):  h
        | | | | |  out: ts(402:403):  h
        | | | | |
        | | | |
        | | | | Mapping: SubExpression
        | | | |  in: hbs(167:181):  (h red=\\"blue\\")
        | | | |  out: ts(406:434):  ({\\\\n      red: \\"blue\\",\\\\n    })
        | | | |
        | | | | | Mapping: Identifier
        | | | | |  in: hbs(170:173):  red
        | | | | |  out: ts(415:418):  red
        | | | | |
        | | | | | Mapping: StringLiteral
        | | | | |  in: hbs(174:180):  \\"blue\\"
        | | | | |  out: ts(420:426):  \\"blue\\"
        | | | | |
        | | | |
        | | | | Mapping: Identifier
        | | | |  in: hbs(186:189):  arr
        | | | |  out: ts(458:461):  arr
        | | | |
        | | | | Mapping: Identifier
        | | | |  in: hbs(190:191):  h
        | | | |  out: ts(463:464):  h
        | | | |
        | | | | Mapping: TextContent
        | | | |  in: hbs(199:207):  Array is
        | | | |  out: ts(495:495):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  in: hbs(208:215):  {{arr}}
        | | | |  out: ts(495:540):  χ.emitContent(χ.resolveOrReturn(arr)())
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  in: hbs(210:213):  arr
        | | | | |  out: ts(533:536):  arr
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  in: hbs(210:213):  arr
        | | | | | |  out: ts(533:536):  arr
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  in: hbs(220:227):  Hash is
        | | | |  out: ts(542:542):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  in: hbs(228:233):  {{h}}
        | | | |  out: ts(542:585):  χ.emitContent(χ.resolveOrReturn(h)())
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  in: hbs(230:231):  h
        | | | | |  out: ts(580:581):  h
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  in: hbs(230:231):  h
        | | | | | |  out: ts(580:581):  h
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  in: hbs(233:234):
        | | | |  out: ts(587:587):
        | | | |
        | | | | Mapping: Identifier
        | | | |  in: hbs(239:242):  let
        | | | |  out: ts(608:611):  let
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  in: hbs(245:247):
        | | |  out: ts(619:619):
        | | |
        | | | Mapping: ElementNode
        | | |  in: hbs(247:258):  <Another />
        | | |  out: ts(619:689):  {\\\\n    const 𝛄 = χ.emitComponent(χ.resolve(Another)());\\\\n    𝛄;\\\\n  }
        | | |
        | | | | Mapping: Identifier
        | | | |  in: hbs(248:255):  Another
        | | | |  out: ts(664:671):  Another
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  in: hbs(258:259):
        | | |  out: ts(689:689):
        | | |
        | |
        |"
      `);
    });
  });
});
