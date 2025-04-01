import ts from 'typescript';
import { describe, test, expect } from 'vitest';
import { rewriteModule } from '@glint/core/transform/index';
import { stripIndent } from 'common-tags';
import { GlintEnvironment } from '@glint/core/config/index';

describe('Transform: rewriteModule', () => {
  describe('inline tagged template', () => {
    const emberTemplateImportsEnvironment = GlintEnvironment.load('ember-template-imports');

    test('with a simple class', () => {
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class MyComponent extends Component {
            <template></template>
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, emberTemplateImportsEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "
        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gts'));

        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

        import Component from '@glimmer/component';
        export default class MyComponent extends Component {
          static { ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {
        __glintRef__; __glintDSL__;
        }) }
        }"
      `);
    });

    test('handles the $ character', () => {
      let script = {
        filename: 'test.gts',
        contents: '<template>${{dollarAmount}}</template>;',
      };

      let transformedModule = rewriteModule(ts, { script }, emberTemplateImportsEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "
        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gts'));

        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

        export default ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(dollarAmount)());
        __glintRef__; __glintDSL__;
        });"
      `);
    });

    test('handles the ` character', () => {
      let script = {
        filename: 'test.gts',
        contents: '<template>`code`</template>;',
      };

      let transformedModule = rewriteModule(ts, { script }, emberTemplateImportsEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "
        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gts'));

        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

        export default ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {
        __glintRef__; __glintDSL__;
        });"
      `);
    });

    test('with a class with type parameters', () => {
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class MyComponent<K extends string> extends Component<{ value: K }> {
            <template></template>
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, emberTemplateImportsEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "
        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gts'));

        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

        import Component from '@glimmer/component';
        export default class MyComponent<K extends string> extends Component<{ value: K }> {
          static { ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {
        __glintRef__; __glintDSL__;
        }) }
        }"
      `);
    });

    test('with an anonymous class', () => {
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class extends Component {
            <template></template>
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, emberTemplateImportsEnvironment);

      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "
        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gts'));

        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

        import Component from '@glimmer/component';
        export default class extends Component {
          static { ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {
        __glintRef__; __glintDSL__;
        }) }
        }"
      `);
    });

    test('with a syntax error', () => {
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class MyComponent extends Component {
            <template>
              {{hello
            </template>
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, emberTemplateImportsEnvironment);

      expect(transformedModule?.errors.length).toBe(1);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "
        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gts'));

        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

        import Component from '@glimmer/component';
        export default class MyComponent extends Component {
          static { ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {
        __glintRef__; __glintDSL__;
        }) }
        }"
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
        "
        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gts'));

        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

        import Component from '@glimmer/component';
        export default class MyComponent extends Component {
        static {
        ({} as typeof import("@glint/environment-ember-loose/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-loose/-private/dsl")) {
        __glintRef__; __glintDSL__;
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
        "
        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gts'));

        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

        import Component from '@glimmer/component';
        class MyComponent extends Component {
        static {
        ({} as typeof import("@glint/environment-ember-loose/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-loose/-private/dsl")) {
        __glintRef__; __glintDSL__;
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
        "
        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gts'));

        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

        import Component from '@glimmer/component';
        export default class MyComponent<K extends string> extends Component<{ value: K }> {
        static {
        ({} as typeof import("@glint/environment-ember-loose/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-loose/-private/dsl")) {
        __glintRef__; __glintDSL__;
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
        "
        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gts'));

        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

        import Component from '@glimmer/component';
        export default class extends Component {
        static {
        ({} as typeof import("@glint/environment-ember-loose/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-loose/-private/dsl")) {
        __glintRef__; __glintDSL__;
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
        "
        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gts'));

        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

        import Component from '@glimmer/component';
        export class MyComponent extends Component {}
        ({} as typeof import("@glint/environment-ember-loose/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-loose/-private/dsl")) {
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintDSL__.Globals["hello"])());
        __glintRef__; __glintDSL__;
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
        "
        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gts'));

        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

        import templateOnly from '@glimmer/component/template-only';

        export default templateOnly();
        ({} as typeof import("@glint/environment-ember-loose/-private/dsl")).templateForBackingValue(({} as unknown as typeof import('./test').default), function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-loose/-private/dsl")) {
        __glintRef__; __glintDSL__;
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
        "
        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gts'));

        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

        import templateOnly from '@glimmer/component/template-only';

        export default templateOnly();
        (/** @type {typeof import("@glint/environment-ember-loose/-private/dsl")} */ ({})).templateForBackingValue((/** @type {typeof import('./test').default} */ ({})), function(__glintRef__, /** @type {typeof import("@glint/environment-ember-loose/-private/dsl")} */ __glintDSL__) {
        __glintRef__; __glintDSL__;
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
        "
        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gts'));

        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

        export default Foo;
        ({} as typeof import("@glint/environment-ember-loose/-private/dsl")).templateForBackingValue(({} as unknown as typeof import('./test').default), function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-loose/-private/dsl")) {
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintDSL__.Globals["hello"])());
        __glintRef__; __glintDSL__;
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
        "
        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gts'));

        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

        import Component from '@glimmer/component';
        export default class MyComponent extends Component {
        static {
        ({} as typeof import("@glint/environment-ember-loose/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-loose/-private/dsl")) {
        __glintRef__; __glintDSL__;
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
        "
        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gts'));

        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

        import Component from '@glimmer/component';
        export default class MyComponent extends Component {
        static {
        ({} as typeof import("@glint/environment-ember-loose/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-loose/-private/dsl")) {
        __glintRef__; __glintDSL__;
        })}
        }"
      `);
    });
  });

  describe('ember-template-imports', () => {
    test('in class extends', () => {
      let customEnv = GlintEnvironment.load(['ember-loose', 'ember-template-imports']);
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          import Component, { hbs } from 'special/component';
          export default class MyComponent extends Component(<template></template>) {

          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, customEnv);

      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "
        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gts'));

        // @ts-expect-error
        ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

        import Component, { hbs } from 'special/component';
        export default class MyComponent extends Component(({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {
        __glintRef__; __glintDSL__;
        })) {

        }"
      `);
    });

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
        |  hbs(22:74):   <template>\\n    Hello, {{this.target}}!\\n  </template>
        |  ts(181:528):  static { ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.target)());\\n__glintRef__; __glintDSL__;\\n}) }
        |
        | | Mapping: Template
        | |  hbs(32:63):   Hello, {{this.target}}!
        | |  ts(412:496):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.target)());
        | |
        | | | Mapping: TextContent
        | | |  hbs(37:43):   Hello,
        | | |  ts(412:412):
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(44:59):   {{this.target}}
        | | |  ts(412:494):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.target)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(44:59):   {{this.target}}
        | | | |  ts(437:493):  __glintDSL__.resolveOrReturn(__glintRef__.this.target)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(46:57):   this.target
        | | | | |  ts(466:490):  __glintRef__.this.target
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(46:50):   this
        | | | | | |  ts(479:483):  this
        | | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(51:57):   target
        | | | | | |  ts(484:490):  target
        | | | | | |
        | | | | |
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  hbs(59:60):   !
        | | |  ts(496:496):
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
        |  hbs(0:44):    <template>\\n  Hello, {{@target}}!\\n</template>
        |  ts(159:499):  export default ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.target)());\\n__glintRef__; __glintDSL__;\\n})
        |
        | | Mapping: Template
        | |  hbs(10:33):   Hello, {{@target}}!
        | |  ts(385:469):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.target)());
        | |
        | | | Mapping: TextContent
        | | |  hbs(13:19):   Hello,
        | | |  ts(385:385):
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(20:31):   {{@target}}
        | | |  ts(385:467):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.target)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(20:31):   {{@target}}
        | | | |  ts(410:466):  __glintDSL__.resolveOrReturn(__glintRef__.args.target)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(22:29):   @target
        | | | | |  ts(439:463):  __glintRef__.args.target
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(23:29):   target
        | | | | | |  ts(457:463):  target
        | | | | | |
        | | | | |
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  hbs(31:32):   !
        | | |  ts(469:469):
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
        |  hbs(56:89):   <template>{{@message}}</template>
        |  ts(215:541):  ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.message)());\\n__glintRef__; __glintDSL__;\\n})
        |
        | | Mapping: Template
        | |  hbs(66:78):   {{@message}}
        | |  ts(426:511):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.message)());
        | |
        | | | Mapping: MustacheStatement
        | | |  hbs(66:78):   {{@message}}
        | | |  ts(426:509):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.message)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(66:78):   {{@message}}
        | | | |  ts(451:508):  __glintDSL__.resolveOrReturn(__glintRef__.args.message)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(68:76):   @message
        | | | | |  ts(480:505):  __glintRef__.args.message
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(69:76):   message
        | | | | | |  ts(498:505):  message
        | | | | | |
        | | | | |
        | | | |
        | | |
        | |
        |

        | Mapping: TemplateEmbedding
        |  hbs(139:174): <template>{{this.title}}</template>
        |  ts(591:937):  static { ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.title)());\\n__glintRef__; __glintDSL__;\\n}) }
        |
        | | Mapping: Template
        | |  hbs(149:163): {{this.title}}
        | |  ts(822:905):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.title)());
        | |
        | | | Mapping: MustacheStatement
        | | |  hbs(149:163): {{this.title}}
        | | |  ts(822:903):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.title)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(149:163): {{this.title}}
        | | | |  ts(847:902):  __glintDSL__.resolveOrReturn(__glintRef__.this.title)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(151:161): this.title
        | | | | |  ts(876:899):  __glintRef__.this.title
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(151:155): this
        | | | | | |  ts(889:893):  this
        | | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(156:161): title
        | | | | | |  ts(894:899):  title
        | | | | | |
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

          <template>
            {{! Intentionally shadowing }}
            {{#let (arr 1 2) (h red="blue") as |arr h|}}
              Array is {{arr}}
              Hash is {{h}}
            {{/let}}
          </template>
        `,
      };

      expect(rewriteModule(ts, { script }, env)?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: TemplateEmbedding
        |  hbs(58:210):  <template>\\n  {{! Intentionally shadowing }}\\n  {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}\\n</template>
        |  ts(217:862):  export default ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {\\n{\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["let"])((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n}))));\\n{\\nconst [arr, h] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());\\n}\\n__glintDSL__.Globals["let"];\\n}\\n__glintRef__; __glintDSL__;\\n})
        |
        | | Mapping: Template
        | |  hbs(68:199):  {{! Intentionally shadowing }}\\n  {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | |  ts(443:832):  {\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["let"])((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n}))));\\n{\\nconst [arr, h] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());\\n}\\n__glintDSL__.Globals["let"];\\n}
        | |
        | | | Mapping: TextContent
        | | |  hbs(68:69):
        | | |  ts(443:443):
        | | |
        | | | Mapping: MustacheCommentStatement
        | | |  hbs(71:101):  {{! Intentionally shadowing }}
        | | |  ts(443:443):
        | | |
        | | | Mapping: BlockStatement
        | | |  hbs(104:198): {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | | |  ts(443:831):  {\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["let"])((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n}))));\\n{\\nconst [arr, h] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());\\n}\\n__glintDSL__.Globals["let"];\\n}
        | | |
        | | | | Mapping: BlockStatement
        | | | |  hbs(104:198): {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | | | |  ts(491:618):  __glintDSL__.resolve(__glintDSL__.Globals["let"])((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n})))
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(107:110): let
        | | | | |  ts(512:539):  __glintDSL__.Globals["let"]
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(107:110): let
        | | | | | |  ts(534:537):  let
        | | | | | |
        | | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(112:115): arr
        | | | | |  ts(560:563):  arr
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(112:115): arr
        | | | | | |  ts(560:563):  arr
        | | | | | |
        | | | | |
        | | | | | Mapping: SubExpression
        | | | | |  hbs(111:120): (arr 1 2)
        | | | | |  ts(566:572):  [1, 2]
        | | | | |
        | | | | | | Mapping: NumberLiteral
        | | | | | |  hbs(116:117): 1
        | | | | | |  ts(567:568):  1
        | | | | | |
        | | | | | | Mapping: NumberLiteral
        | | | | | |  hbs(118:119): 2
        | | | | | |  ts(570:571):  2
        | | | | | |
        | | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(122:123): h
        | | | | |  ts(594:595):  h
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(122:123): h
        | | | | | |  ts(594:595):  h
        | | | | | |
        | | | | |
        | | | | | Mapping: SubExpression
        | | | | |  hbs(121:135): (h red="blue")
        | | | | |  ts(598:616):  ({\\nred: "blue",\\n})
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(124:127): red
        | | | | | |  ts(601:604):  red
        | | | | | |
        | | | | | | Mapping: StringLiteral
        | | | | | |  hbs(128:134): "blue"
        | | | | | |  ts(606:612):  "blue"
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(140:143): arr
        | | | |  ts(630:633):  arr
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(144:145): h
        | | | |  ts(635:636):  h
        | | | |
        | | | | Mapping: TextContent
        | | | |  hbs(153:161): Array is
        | | | |  ts(675:675):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(162:169): {{arr}}
        | | | |  ts(675:736):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)())
        | | | |
        | | | | | Mapping: MustacheStatement
        | | | | |  hbs(162:169): {{arr}}
        | | | | |  ts(700:735):  __glintDSL__.resolveOrReturn(arr)()
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(164:167): arr
        | | | | | |  ts(729:732):  arr
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(164:167): arr
        | | | | | | |  ts(729:732):  arr
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  hbs(174:181): Hash is
        | | | |  ts(738:738):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(182:187): {{h}}
        | | | |  ts(738:797):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)())
        | | | |
        | | | | | Mapping: MustacheStatement
        | | | | |  hbs(182:187): {{h}}
        | | | | |  ts(763:796):  __glintDSL__.resolveOrReturn(h)()
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(184:185): h
        | | | | | |  ts(792:793):  h
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(184:185): h
        | | | | | | |  ts(792:793):  h
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  hbs(187:188):
        | | | |  ts(799:799):
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(193:196): let
        | | | |  ts(823:826):  let
        | | | |
        | | |
        | |
        |"
      `);
    });

    describe('satisfies', () => {
      test('with implicit export default', () => {
        let customEnv = GlintEnvironment.load(['ember-loose', 'ember-template-imports']);
        let script = {
          filename: 'test.gts',
          contents: stripIndent`
            import type { TOC } from '@ember/component/template-only';
            <template>HelloWorld!</template> satisfies TOC<{
              Blocks: { default: [] }
            }>;
          `,
        };

        let transformedModule = rewriteModule(ts, { script }, customEnv);

        expect(transformedModule?.errors).toEqual([]);
        expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
          "
          // @ts-expect-error
          ({} as typeof import('./__glint-hacky-nonexistent.gts'));

          // @ts-expect-error
          ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

          import type { TOC } from '@ember/component/template-only';
          export default ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {
          __glintRef__; __glintDSL__;
          }) satisfies TOC<{
            Blocks: { default: [] }
          }>;"
        `);
      });

      test('with two template-only components', () => {
        const emberTemplateImportsEnvironment = GlintEnvironment.load(['ember-template-imports']);

        let script = {
          filename: 'test.gts',
          contents: [
            `import type { TOC } from '@ember/component/template-only';`,
            ``,
            `const SmolComp = `,
            `  <template>`,
            `    Hello there, {{@name}}`,
            `  </template> satisfies TOC<{ Args: { name: string }}>;`,
            ``,
            `<template>`,
            `  <SmolComp @name="Ember" />`,
            `</template> satisfies TOC<{ Args: {}, Blocks: {}, Element: null }>`,
            ``,
          ].join('\n'),
        };

        let transformedModule = rewriteModule(ts, { script }, emberTemplateImportsEnvironment);

        expect(transformedModule?.errors?.length).toBe(0);
        expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
          "
          // @ts-expect-error
          ({} as typeof import('./__glint-hacky-nonexistent.gts'));

          // @ts-expect-error
          ({} as typeof import('./__glint-hacky-nonexistent.gjs'));

          import type { TOC } from '@ember/component/template-only';

          const SmolComp = 
            ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {
          __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.name)());
          __glintRef__; __glintDSL__;
          }) satisfies TOC<{ Args: { name: string }}>;

          export default ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {
          {
          const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(SmolComp)({ 
          name: "Ember", ...__glintDSL__.NamedArgsMarker }));
          __glintDSL__.applyAttributes(__glintY__.element, {


          });
          }
          __glintRef__; __glintDSL__;
          }) satisfies TOC<{ Args: {}, Blocks: {}, Element: null }>
          "
        `);
      });
    });
  });
});
