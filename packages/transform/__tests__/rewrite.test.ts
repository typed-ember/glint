import { rewriteModule } from '../src';
import { stripIndent } from 'common-tags';
import { GlintEnvironment } from '@glint/config';

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

      let transformedModule = rewriteModule({ script }, glimmerxEnvironment);

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

      let transformedModule = rewriteModule({ script }, glimmerxEnvironment);

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

      let transformedModule = rewriteModule({ script }, glimmerxEnvironment);

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

      let transformedModule = rewriteModule({ script }, glimmerxEnvironment);

      expect(transformedModule?.errors.length).toBe(1);
      expect(transformedModule?.transformedContents).toBe(script.contents);

      expect(transformedModule?.getOriginalOffset(100)).toEqual({ offset: 100, source: script });
      expect(transformedModule?.getTransformedOffset(script.filename, 100)).toEqual(100);
    });

    test('outer variable capture', () => {
      let testEnvironment = new GlintEnvironment('test', {
        tags: {
          '@glint/test-env': {
            hbsCapture: { typesSource: '@glint/test-env', capturesOuterScope: true },
            hbsIgnore: { typesSource: '@glint/test-env', capturesOuterScope: false },
          },
        },
      });

      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import { hbsCapture, hbsIgnore } from '@glint/test-env';

          const message = 'hello';

          hbsCapture\`{{message}}\`;
          hbsIgnore\`{{message}}\`;
        `,
      };

      let transformedModule = rewriteModule({ script }, testEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import { hbsCapture, hbsIgnore } from '@glint/test-env';

        const message = 'hello';

        ({} as typeof import(\\"@glint/test-env\\")).template(function(𝚪, χ: typeof import(\\"@glint/test-env\\")) {
          hbsCapture;
          χ.emitValue(χ.resolveOrReturn(message)({}));
          𝚪; χ;
        });
        ({} as typeof import(\\"@glint/test-env\\")).template(function(𝚪, χ: typeof import(\\"@glint/test-env\\")) {
          hbsIgnore;
          χ.emitValue(χ.resolveOrReturn(χ.Globals[\\"message\\"])({}));
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

      let transformedModule = rewriteModule({ script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent extends Component {
        protected static '~template' = ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-ember-loose/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
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

      let transformedModule = rewriteModule({ script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        class MyComponent extends Component {
        protected static '~template' = ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-ember-loose/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
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

      let transformedModule = rewriteModule({ script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent<K extends string> extends Component<{ value: K }> {
        protected static '~template' = ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function<K extends string>(𝚪: import(\\"@glint/environment-ember-loose/-private/dsl\\").ResolveContext<MyComponent<K>>, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
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

      let transformedModule = rewriteModule({ script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([
        {
          message: 'Classes with an associated template must have a name',
          source: script,
          location: {
            start: script.contents.indexOf('class'),
            end: script.contents.lastIndexOf('}') + 1,
          },
        },
      ]);

      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class extends Component {
        protected static '~template' = ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          𝚪; χ;
        });
        }"
      `);
    });

    test('with no default value export', () => {
      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export class MyComponent extends Component {}
        `,
      };

      let template = {
        filename: 'test.hbs',
        contents: stripIndent``,
      };

      let transformedModule = rewriteModule({ script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([
        {
          message:
            'Modules with an associated template must have a default export that is a class declaration or expression',
          source: script,
          location: {
            start: 0,
            end: script.contents.length,
          },
        },
      ]);

      expect(transformedModule?.getOriginalRange(0, script.contents.length)).toEqual({
        source: script,
        start: 0,
        end: script.contents.length,
      });
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
        contents: stripIndent``,
      };

      let transformedModule = rewriteModule({ script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([
        {
          message: 'Unable to resolve a class body to associate a template declaration to',
          source: script,
          location: {
            start: script.contents.indexOf('Foo'),
            end: script.contents.indexOf(';'),
          },
        },
      ]);
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

      let transformedModule = rewriteModule({ script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent extends Component {
        protected static '~template' = ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-ember-loose/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
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

      let transformedModule = rewriteModule({ script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors.length).toBe(1);
      expect(transformedModule?.transformedContents).toBe(script.contents);

      expect(transformedModule?.getOriginalOffset(50)).toEqual({ offset: 50, source: script });
      expect(transformedModule?.getTransformedOffset(script.filename, 50)).toEqual(50);
      expect(transformedModule?.getTransformedOffset(template.filename, 5)).toEqual(
        script.contents.lastIndexOf('}')
      );
    });
  });
});
