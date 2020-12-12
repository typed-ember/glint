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
          import Component, { hbs } from '@glimmerx/component';
          export default class MyComponent extends Component {
            static template = hbs\`\`;
          }
        `,
      };

      let transformedModule = rewriteModule({ script }, glimmerxEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component, { hbs } from '@glimmerx/component';
        export default class MyComponent extends Component {
          static template = (() => {
          hbs;
          let χ!: typeof import(\\"@glint/environment-glimmerx/types\\");
          return χ.template(function(𝚪: import(\\"@glint/environment-glimmerx/types\\").ResolveContext<MyComponent>) {
            𝚪;
          });
        })();
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

      let transformedModule = rewriteModule({ script }, glimmerxEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component, { hbs } from '@glimmerx/component';
        export default class MyComponent<K extends string> extends Component<{ value: K }> {
          static template = (() => {
          hbs;
          let χ!: typeof import(\\"@glint/environment-glimmerx/types\\");
          return χ.template(function<K extends string>(𝚪: import(\\"@glint/environment-glimmerx/types\\").ResolveContext<MyComponent<K>>) {
            𝚪;
          });
        })();
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
        "import Component, { hbs } from '@glimmerx/component';
        export default class extends Component {
          static template = (() => {
          hbs;
          let χ!: typeof import(\\"@glint/environment-glimmerx/types\\");
          return χ.template(function(𝚪: import(\\"@glint/environment-glimmerx/types\\").ResolveContext<unknown>) {
            𝚪;
          });
        })();
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

      let transformedModule = rewriteModule({ script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent extends Component {
        private static '~template' = (() => {
          MyComponent['~template'];
          let χ!: typeof import(\\"@glint/environment-ember-loose/types\\");
          return χ.template(function(𝚪: import(\\"@glint/environment-ember-loose/types\\").ResolveContext<MyComponent>) {
            𝚪;
          });
        })();
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
        private static '~template' = (() => {
          MyComponent['~template'];
          let χ!: typeof import(\\"@glint/environment-ember-loose/types\\");
          return χ.template(function(𝚪: import(\\"@glint/environment-ember-loose/types\\").ResolveContext<MyComponent>) {
            𝚪;
          });
        })();
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
        private static '~template' = (() => {
          MyComponent['~template'];
          let χ!: typeof import(\\"@glint/environment-ember-loose/types\\");
          return χ.template(function<K extends string>(𝚪: import(\\"@glint/environment-ember-loose/types\\").ResolveContext<MyComponent<K>>) {
            𝚪;
          });
        })();
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
        private static '~template' = (() => {
          let χ!: typeof import(\\"@glint/environment-ember-loose/types\\");
          return χ.template(function(𝚪: import(\\"@glint/environment-ember-loose/types\\").ResolveContext<unknown>) {
            𝚪;
          });
        })();
        }"
      `);
    });
  });
});
