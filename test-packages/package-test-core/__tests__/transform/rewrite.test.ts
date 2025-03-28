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
        "import __GLINT_GTS_EXTENSION_HACK__ from './__glint-non-existent.gts';
         import __GLINT_GJS_EXTENSION_HACK__ from './__glint-non-existent.gjs';
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
        "import __GLINT_GTS_EXTENSION_HACK__ from './__glint-non-existent.gts';
         import __GLINT_GJS_EXTENSION_HACK__ from './__glint-non-existent.gjs';
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
        "import __GLINT_GTS_EXTENSION_HACK__ from './__glint-non-existent.gts';
         import __GLINT_GJS_EXTENSION_HACK__ from './__glint-non-existent.gjs';
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
        "import __GLINT_GTS_EXTENSION_HACK__ from './__glint-non-existent.gts';
         import __GLINT_GJS_EXTENSION_HACK__ from './__glint-non-existent.gjs';
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
        "import __GLINT_GTS_EXTENSION_HACK__ from './__glint-non-existent.gts';
         import __GLINT_GJS_EXTENSION_HACK__ from './__glint-non-existent.gjs';
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
        "import __GLINT_GTS_EXTENSION_HACK__ from './__glint-non-existent.gts';
         import __GLINT_GJS_EXTENSION_HACK__ from './__glint-non-existent.gjs';
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
        "import __GLINT_GTS_EXTENSION_HACK__ from './__glint-non-existent.gts';
         import __GLINT_GJS_EXTENSION_HACK__ from './__glint-non-existent.gjs';
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
        "import __GLINT_GTS_EXTENSION_HACK__ from './__glint-non-existent.gts';
         import __GLINT_GJS_EXTENSION_HACK__ from './__glint-non-existent.gjs';
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
        "import __GLINT_GTS_EXTENSION_HACK__ from './__glint-non-existent.gts';
         import __GLINT_GJS_EXTENSION_HACK__ from './__glint-non-existent.gjs';
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
        "import __GLINT_GTS_EXTENSION_HACK__ from './__glint-non-existent.gts';
         import __GLINT_GJS_EXTENSION_HACK__ from './__glint-non-existent.gjs';
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
        "import __GLINT_GTS_EXTENSION_HACK__ from './__glint-non-existent.gts';
         import __GLINT_GJS_EXTENSION_HACK__ from './__glint-non-existent.gjs';
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
        "import __GLINT_GTS_EXTENSION_HACK__ from './__glint-non-existent.gts';
         import __GLINT_GJS_EXTENSION_HACK__ from './__glint-non-existent.gjs';
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
        "import __GLINT_GTS_EXTENSION_HACK__ from './__glint-non-existent.gts';
         import __GLINT_GJS_EXTENSION_HACK__ from './__glint-non-existent.gjs';
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
        "import __GLINT_GTS_EXTENSION_HACK__ from './__glint-non-existent.gts';
         import __GLINT_GJS_EXTENSION_HACK__ from './__glint-non-existent.gjs';
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
        "import __GLINT_GTS_EXTENSION_HACK__ from './__glint-non-existent.gts';
         import __GLINT_GJS_EXTENSION_HACK__ from './__glint-non-existent.gjs';
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
        "import __GLINT_GTS_EXTENSION_HACK__ from './__glint-non-existent.gts';
         import __GLINT_GJS_EXTENSION_HACK__ from './__glint-non-existent.gjs';
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
        "import __GLINT_GTS_EXTENSION_HACK__ from './__glint-non-existent.gts';
         import __GLINT_GJS_EXTENSION_HACK__ from './__glint-non-existent.gjs';
        import Component, { hbs } from 'special/component';
        export default class MyComponent extends Component(({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {
        __glintRef__; __glintDSL__;
        })) {

        }"
      `);
    });

    test('handles satisfies', () => {
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
"import type { TOC } from '@ember/component/template-only';

const SmolComp = 
  ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {
__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.name)());
__glintRef__; __glintDSL__;
}) satisfies TOC<{ Args: { name: string }}>;

export default ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {
{
const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(SmolComp)({ 
name: "Ember", ...__glintDSL__.NamedArgsMarker }));
__glintY__;
}
__glintRef__; __glintDSL__;
}) satisfies TOC<{ Args: {}, Blocks: {}, Element: null }>
"
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
        |  ts(165:512):  static { ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.target)());\\n__glintRef__; __glintDSL__;\\n}) }
        |
        | | Mapping: Template
        | |  hbs(32:63):   Hello, {{this.target}}!
        | |  ts(396:480):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.target)());
        | |
        | | | Mapping: TextContent
        | | |  hbs(37:43):   Hello,
        | | |  ts(396:396):
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(44:59):   {{this.target}}
        | | |  ts(396:478):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.target)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(44:59):   {{this.target}}
        | | | |  ts(421:477):  __glintDSL__.resolveOrReturn(__glintRef__.this.target)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(46:57):   this.target
        | | | | |  ts(450:474):  __glintRef__.this.target
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(46:50):   this
        | | | | | |  ts(463:467):  this
        | | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(51:57):   target
        | | | | | |  ts(468:474):  target
        | | | | | |
        | | | | |
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  hbs(59:60):   !
        | | |  ts(480:480):
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
        |  ts(143:483):  export default ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.target)());\\n__glintRef__; __glintDSL__;\\n})
        |
        | | Mapping: Template
        | |  hbs(10:33):   Hello, {{@target}}!
        | |  ts(369:453):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.target)());
        | |
        | | | Mapping: TextContent
        | | |  hbs(13:19):   Hello,
        | | |  ts(369:369):
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(20:31):   {{@target}}
        | | |  ts(369:451):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.target)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(20:31):   {{@target}}
        | | | |  ts(394:450):  __glintDSL__.resolveOrReturn(__glintRef__.args.target)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(22:29):   @target
        | | | | |  ts(423:447):  __glintRef__.args.target
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(23:29):   target
        | | | | | |  ts(441:447):  target
        | | | | | |
        | | | | |
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  hbs(31:32):   !
        | | |  ts(453:453):
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
        |  ts(199:525):  ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.message)());\\n__glintRef__; __glintDSL__;\\n})
        |
        | | Mapping: Template
        | |  hbs(66:78):   {{@message}}
        | |  ts(410:495):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.message)());
        | |
        | | | Mapping: MustacheStatement
        | | |  hbs(66:78):   {{@message}}
        | | |  ts(410:493):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.message)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(66:78):   {{@message}}
        | | | |  ts(435:492):  __glintDSL__.resolveOrReturn(__glintRef__.args.message)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(68:76):   @message
        | | | | |  ts(464:489):  __glintRef__.args.message
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(69:76):   message
        | | | | | |  ts(482:489):  message
        | | | | | |
        | | | | |
        | | | |
        | | |
        | |
        |

        | Mapping: TemplateEmbedding
        |  hbs(139:174): <template>{{this.title}}</template>
        |  ts(575:921):  static { ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.title)());\\n__glintRef__; __glintDSL__;\\n}) }
        |
        | | Mapping: Template
        | |  hbs(149:163): {{this.title}}
        | |  ts(806:889):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.title)());
        | |
        | | | Mapping: MustacheStatement
        | | |  hbs(149:163): {{this.title}}
        | | |  ts(806:887):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.title)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(149:163): {{this.title}}
        | | | |  ts(831:886):  __glintDSL__.resolveOrReturn(__glintRef__.this.title)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(151:161): this.title
        | | | | |  ts(860:883):  __glintRef__.this.title
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(151:155): this
        | | | | | |  ts(873:877):  this
        | | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(156:161): title
        | | | | | |  ts(878:883):  title
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
        |  ts(201:846):  export default ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {\\n{\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["let"])((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n}))));\\n{\\nconst [arr, h] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());\\n}\\n__glintDSL__.Globals["let"];\\n}\\n__glintRef__; __glintDSL__;\\n})
        |
        | | Mapping: Template
        | |  hbs(68:199):  {{! Intentionally shadowing }}\\n  {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | |  ts(427:816):  {\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["let"])((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n}))));\\n{\\nconst [arr, h] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());\\n}\\n__glintDSL__.Globals["let"];\\n}
        | |
        | | | Mapping: TextContent
        | | |  hbs(68:69):
        | | |  ts(427:427):
        | | |
        | | | Mapping: MustacheCommentStatement
        | | |  hbs(71:101):  {{! Intentionally shadowing }}
        | | |  ts(427:427):
        | | |
        | | | Mapping: BlockStatement
        | | |  hbs(104:198): {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | | |  ts(427:815):  {\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["let"])((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n}))));\\n{\\nconst [arr, h] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());\\n}\\n__glintDSL__.Globals["let"];\\n}
        | | |
        | | | | Mapping: BlockStatement
        | | | |  hbs(104:198): {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | | | |  ts(475:602):  __glintDSL__.resolve(__glintDSL__.Globals["let"])((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n})))
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(107:110): let
        | | | | |  ts(496:523):  __glintDSL__.Globals["let"]
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(107:110): let
        | | | | | |  ts(518:521):  let
        | | | | | |
        | | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(112:115): arr
        | | | | |  ts(544:547):  arr
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(112:115): arr
        | | | | | |  ts(544:547):  arr
        | | | | | |
        | | | | |
        | | | | | Mapping: SubExpression
        | | | | |  hbs(111:120): (arr 1 2)
        | | | | |  ts(550:556):  [1, 2]
        | | | | |
        | | | | | | Mapping: NumberLiteral
        | | | | | |  hbs(116:117): 1
        | | | | | |  ts(551:552):  1
        | | | | | |
        | | | | | | Mapping: NumberLiteral
        | | | | | |  hbs(118:119): 2
        | | | | | |  ts(554:555):  2
        | | | | | |
        | | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(122:123): h
        | | | | |  ts(578:579):  h
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(122:123): h
        | | | | | |  ts(578:579):  h
        | | | | | |
        | | | | |
        | | | | | Mapping: SubExpression
        | | | | |  hbs(121:135): (h red="blue")
        | | | | |  ts(582:600):  ({\\nred: "blue",\\n})
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(124:127): red
        | | | | | |  ts(585:588):  red
        | | | | | |
        | | | | | | Mapping: StringLiteral
        | | | | | |  hbs(128:134): "blue"
        | | | | | |  ts(590:596):  "blue"
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(140:143): arr
        | | | |  ts(614:617):  arr
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(144:145): h
        | | | |  ts(619:620):  h
        | | | |
        | | | | Mapping: TextContent
        | | | |  hbs(153:161): Array is
        | | | |  ts(659:659):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(162:169): {{arr}}
        | | | |  ts(659:720):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)())
        | | | |
        | | | | | Mapping: MustacheStatement
        | | | | |  hbs(162:169): {{arr}}
        | | | | |  ts(684:719):  __glintDSL__.resolveOrReturn(arr)()
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(164:167): arr
        | | | | | |  ts(713:716):  arr
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(164:167): arr
        | | | | | | |  ts(713:716):  arr
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  hbs(174:181): Hash is
        | | | |  ts(722:722):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(182:187): {{h}}
        | | | |  ts(722:781):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)())
        | | | |
        | | | | | Mapping: MustacheStatement
        | | | | |  hbs(182:187): {{h}}
        | | | | |  ts(747:780):  __glintDSL__.resolveOrReturn(h)()
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(184:185): h
        | | | | | |  ts(776:777):  h
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(184:185): h
        | | | | | | |  ts(776:777):  h
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  hbs(187:188):
        | | | |  ts(783:783):
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(193:196): let
        | | | |  ts(807:810):  let
        | | | |
        | | |
        | |
        |"
      `);
    });

    test('with implicit export default and satisfies', () => {
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
        "import __GLINT_GTS_EXTENSION_HACK__ from './__glint-non-existent.gts';
         import __GLINT_GJS_EXTENSION_HACK__ from './__glint-non-existent.gjs';
        import type { TOC } from '@ember/component/template-only';
        export default ({} as typeof import("@glint/environment-ember-template-imports/-private/dsl")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/environment-ember-template-imports/-private/dsl")) {
        __glintRef__; __glintDSL__;
        }) satisfies TOC<{
          Blocks: { default: [] }
        }>;"
      `);
    });
  });
});
