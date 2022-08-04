import ts from 'typescript';
import { describe, test, expect } from 'vitest';
import { rewriteModule } from '../src';
import { stripIndent } from 'common-tags';
import { GlintEnvironment } from '@glint/config/lib/environment';

describe('rewriteModule', () => {
  describe('inline tagged template', () => {
    const glimmerxEnvironment = GlintEnvironment.load('glimmerx');

    test('with a simple class', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component, { hbs } from '@glint/environment-glimmerx/component';
          export default class MyComponent extends Component {
            static template = hbs\`\`;
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, glimmerxEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component, { hbs } from '@glint/environment-glimmerx/component';
        export default class MyComponent extends Component {
          static template = ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {
          hbs;
          𝚪; χ;
        }) as unknown;
        }"
      `);
    });

    test('with a class with type parameters', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component, { hbs } from '@glint/environment-glimmerx/component';
          export default class MyComponent<K extends string> extends Component<{ value: K }> {
            static template = hbs\`\`;
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, glimmerxEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component, { hbs } from '@glint/environment-glimmerx/component';
        export default class MyComponent<K extends string> extends Component<{ value: K }> {
          static template = ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).template(function<K extends string>(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<MyComponent<K>>, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {
          hbs;
          𝚪; χ;
        }) as unknown;
        }"
      `);
    });

    test('with an anonymous class', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component, { hbs } from '@glint/environment-glimmerx/component';
          export default class extends Component {
            static template = hbs\`\`;
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, glimmerxEnvironment);

      expect(transformedModule?.errors).toEqual([
        {
          message: 'Classes containing templates must have a name',
          source: script,
          location: {
            start: script.contents.indexOf('hbs`'),
            end: script.contents.lastIndexOf('`') + 1,
          },
        },
      ]);

      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component, { hbs } from '@glint/environment-glimmerx/component';
        export default class extends Component {
          static template = ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).template(function(𝚪, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {
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
          import Component, { hbs } from '@glint/environment-glimmerx/component';
          export default class MyComponent extends Component {
            static template = hbs\`
              {{hello
            \`;
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, glimmerxEnvironment);

      expect(transformedModule?.errors.length).toBe(1);
      expect(transformedModule?.transformedContents).toBe(script.contents);

      expect(transformedModule?.getOriginalOffset(100)).toEqual({ offset: 100, source: script });
      expect(transformedModule?.getTransformedOffset(script.filename, 100)).toEqual(100);
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

        ({} as typeof import(\\"@glint/test-env\\")).template(function(𝚪, χ: typeof import(\\"@glint/test-env\\")) {
          hbsCaptureAll;
          χ.emitContent(χ.resolveOrReturn(global)({}));
          χ.emitContent(χ.resolveOrReturn(message)({}));
          𝚪; χ;
        });
        ({} as typeof import(\\"@glint/test-env\\")).template(function(𝚪, χ: typeof import(\\"@glint/test-env\\")) {
          hbsCaptureSome;
          χ.emitContent(χ.resolveOrReturn(χ.Globals[\\"global\\"])({}));
          χ.emitContent(χ.resolveOrReturn(message)({}));
          𝚪; χ;
        });
        ({} as typeof import(\\"@glint/test-env\\")).template(function(𝚪, χ: typeof import(\\"@glint/test-env\\")) {
          hbsCaptureNone;
          χ.emitContent(χ.resolveOrReturn(χ.Globals[\\"global\\"])({}));
          χ.emitContent(χ.resolveOrReturn(χ.Globals[\\"message\\"])({}));
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
        protected static '~template:MyComponent' = ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-ember-loose/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          𝚪; χ;
        }) as unknown;
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
        protected static '~template:MyComponent' = ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-ember-loose/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          𝚪; χ;
        }) as unknown;
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
        protected static '~template:MyComponent' = ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function<K extends string>(𝚪: import(\\"@glint/environment-ember-loose/-private/dsl\\").ResolveContext<MyComponent<K>>, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          𝚪; χ;
        }) as unknown;
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

      expect(transformedModule?.errors).toEqual([
        {
          message: 'Classes with an associated template must have a name',
          source: script,
          location: {
            start: script.contents.indexOf('export default'),
            end: script.contents.lastIndexOf('}') + 1,
          },
        },
      ]);

      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class extends Component {
        protected static '~template:undefined' = ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          𝚪; χ;
        });
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
        ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          χ.emitContent(χ.resolveOrReturn(χ.Globals[\\"hello\\"])({}));
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
        ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-ember-loose/-private/dsl\\").ResolveContext<typeof import('./test').default>, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          𝚪; χ;
        }) as unknown;
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
        ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-ember-loose/-private/dsl\\").ResolveContext<typeof import('./test').default>, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          χ.emitContent(χ.resolveOrReturn(χ.Globals[\\"hello\\"])({}));
          𝚪; χ;
        }) as unknown;
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
        protected static '~template:MyComponent' = ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-ember-loose/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          𝚪; χ;
        }) as unknown;
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
      expect(transformedModule?.transformedContents).toBe(script.contents);

      expect(transformedModule?.getOriginalOffset(50)).toEqual({ offset: 50, source: script });
      expect(transformedModule?.getTransformedOffset(script.filename, 50)).toEqual(50);
      expect(transformedModule?.getTransformedOffset(template.filename, 5)).toEqual(
        script.contents.lastIndexOf('}')
      );
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

        | Mapping: Template
        |  hbs(22:74):   <template>\\\\n    Hello, {{this.target}}!\\\\n  </template>
        |  ts(22:385):   static { ({} as typeof import(\\"@glint/environment-ember-template-imports/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-ember-template-imports/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-ember-template-imports/-private/dsl\\")) {\\\\n  χ.emitContent(χ.resolveOrReturn(𝚪.this.target)({}));\\\\n  𝚪; χ;\\\\n}) as unknown }
        |
        | | Mapping: Identifier
        | |  hbs(22:22):
        | |  ts(213:224):  MyComponent
        | |
        | | Mapping: MustacheStatement
        | |  hbs(44:59):   {{this.target}}
        | |  ts(305:359):  χ.emitContent(χ.resolveOrReturn(𝚪.this.target)({}))
        | |
        | | | Mapping: PathExpression
        | | |  hbs(46:57):   this.target
        | | |  ts(339:353):  𝚪.this.target
        | | |
        | | | | Mapping: Identifier
        | | | |  hbs(46:50):   this
        | | | |  ts(342:346):  this
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(51:57):   target
        | | | |  ts(347:353):  target
        | | | |
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

        | Mapping: Template
        |  hbs(0:44):    <template>\\\\n  Hello, {{@target}}!\\\\n</template>
        |  ts(0:262):    export default ({} as typeof import(\\"@glint/environment-ember-template-imports/-private/dsl\\")).template(function(𝚪, χ: typeof import(\\"@glint/environment-ember-template-imports/-private/dsl\\")) {\\\\n  χ.emitContent(χ.resolveOrReturn(𝚪.args.target)({}));\\\\n  𝚪; χ;\\\\n})
        |
        | | Mapping: MustacheStatement
        | |  hbs(20:31):   {{@target}}
        | |  ts(195:249):  χ.emitContent(χ.resolveOrReturn(𝚪.args.target)({}))
        | |
        | | | Mapping: PathExpression
        | | |  hbs(22:29):   @target
        | | |  ts(229:243):  𝚪.args.target
        | | |
        | | | | Mapping: Identifier
        | | | |  hbs(23:29):   target
        | | | |  ts(237:243):  target
        | | | |
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

        | Mapping: Template
        |  hbs(56:89):   <template>{{@message}}</template>
        |  ts(56:304):   ({} as typeof import(\\"@glint/environment-ember-template-imports/-private/dsl\\")).template(function(𝚪, χ: typeof import(\\"@glint/environment-ember-template-imports/-private/dsl\\")) {\\\\n  χ.emitContent(χ.resolveOrReturn(𝚪.args.message)({}));\\\\n  𝚪; χ;\\\\n})
        |
        | | Mapping: MustacheStatement
        | |  hbs(66:78):   {{@message}}
        | |  ts(236:291):  χ.emitContent(χ.resolveOrReturn(𝚪.args.message)({}))
        | |
        | | | Mapping: PathExpression
        | | |  hbs(68:76):   @message
        | | |  ts(270:285):  𝚪.args.message
        | | |
        | | | | Mapping: Identifier
        | | | |  hbs(69:76):   message
        | | | |  ts(278:285):  message
        | | | |
        | | |
        | |
        |

        | Mapping: Template
        |  hbs(139:174): <template>{{this.title}}</template>
        |  ts(354:716):  static { ({} as typeof import(\\"@glint/environment-ember-template-imports/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-ember-template-imports/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-ember-template-imports/-private/dsl\\")) {\\\\n  χ.emitContent(χ.resolveOrReturn(𝚪.this.title)({}));\\\\n  𝚪; χ;\\\\n}) as unknown }
        |
        | | Mapping: Identifier
        | |  hbs(139:139):
        | |  ts(545:556):  MyComponent
        | |
        | | Mapping: MustacheStatement
        | |  hbs(149:163): {{this.title}}
        | |  ts(637:690):  χ.emitContent(χ.resolveOrReturn(𝚪.this.title)({}))
        | |
        | | | Mapping: PathExpression
        | | |  hbs(151:161): this.title
        | | |  ts(671:684):  𝚪.this.title
        | | |
        | | | | Mapping: Identifier
        | | | |  hbs(151:155): this
        | | | |  ts(674:678):  this
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(156:161): title
        | | | |  ts(679:684):  title
        | | | |
        | | |
        | |
        |"
      `);
    });
  });
});
