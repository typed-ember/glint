import { rewriteModule } from '../src';
import { stripIndent } from 'common-tags';
import { GlintEnvironment } from '@glint/config';

const glimmerxEnvironment = GlintEnvironment.load('glimmerx');

describe('rewriteModule', () => {
  test('with a simple class', () => {
    let code = stripIndent`
      import Component, { hbs } from '@glimmerx/component';
      export default class MyComponent extends Component {
        static template = hbs\`\`;
      }
    `;

    let transformedModule = rewriteModule('test.ts', code, glimmerxEnvironment);

    expect(transformedModule?.errors).toEqual([]);
    expect(transformedModule?.transformedSource).toMatchInlineSnapshot(`
      "import Component, { hbs } from '@glimmerx/component';
      export default class MyComponent extends Component {
        static template = (() => {
        hbs;
        let χ!: typeof import(\\"@glint/environment-glimmerx/types\\");
        return χ.template(function*(𝚪: import(\\"@glint/environment-glimmerx/types\\").ResolveContext<MyComponent>) {
          𝚪;
        });
      })();
      }"
    `);
  });

  test('with a class with type parameters', () => {
    let code = stripIndent`
      import Component, { hbs } from '@glimmerx/component';
      export default class MyComponent<K extends string> extends Component<{ value: K }> {
        static template = hbs\`\`;
      }
    `;

    let transformedModule = rewriteModule('test.ts', code, glimmerxEnvironment);

    expect(transformedModule?.errors).toEqual([]);
    expect(transformedModule?.transformedSource).toMatchInlineSnapshot(`
      "import Component, { hbs } from '@glimmerx/component';
      export default class MyComponent<K extends string> extends Component<{ value: K }> {
        static template = (() => {
        hbs;
        let χ!: typeof import(\\"@glint/environment-glimmerx/types\\");
        return χ.template(function*<K extends string>(𝚪: import(\\"@glint/environment-glimmerx/types\\").ResolveContext<MyComponent<K>>) {
          𝚪;
        });
      })();
      }"
    `);
  });

  test('with an anonymous class', () => {
    let code = stripIndent`
      import Component, { hbs } from '@glimmerx/component';
      export default class extends Component {
        static template = hbs\`\`;
      }
    `;

    let transformedModule = rewriteModule('test.ts', code, glimmerxEnvironment);

    expect(transformedModule?.errors).toEqual([
      {
        message: 'Classes containing templates must have a name',
        location: {
          start: code.indexOf('hbs`'),
          end: code.lastIndexOf('`') + 1,
        },
      },
    ]);

    expect(transformedModule?.transformedSource).toMatchInlineSnapshot(`
      "import Component, { hbs } from '@glimmerx/component';
      export default class extends Component {
        static template = (() => {
        hbs;
        let χ!: typeof import(\\"@glint/environment-glimmerx/types\\");
        return χ.template(function*(𝚪: import(\\"@glint/environment-glimmerx/types\\").ResolveContext<unknown>) {
          𝚪;
        });
      })();
      }"
    `);
  });
});
