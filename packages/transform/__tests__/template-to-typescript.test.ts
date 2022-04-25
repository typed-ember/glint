import { stripIndent } from 'common-tags';
import { templateToTypescript, TemplateToTypescriptOptions } from '../src/template-to-typescript';

describe('rewriteTemplate', () => {
  // Slices out the template boilerplate to return only the code representing
  // the body, to keep snapshots brief and focused.
  function templateBody(
    template: string,
    options: Omit<TemplateToTypescriptOptions, 'typesPath'> = {}
  ): string {
    let { result, errors } = templateToTypescript(template, {
      ...options,
      typesPath: '@glint/template',
    });
    if (errors.length) {
      throw new Error('Unexpected error(s): ' + errors.map((e) => e.message).join(', '));
    }

    return (result?.code ?? '')
      .split('\n')
      .slice(1, -2)
      .join('\n')
      .replace(/(^|\n) {2}/g, '$1');
  }

  describe('template boilerplate', () => {
    test('without any specified type parameters or context type', () => {
      expect(templateToTypescript('', { typesPath: '@glint/template' }).result?.code)
        .toMatchInlineSnapshot(`
        "({} as typeof import(\\"@glint/template\\")).template(function(𝚪, χ: typeof import(\\"@glint/template\\")) {
          𝚪; χ;
        })"
      `);
    });

    test('given type parameters and context type', () => {
      let typeParams = '<T extends string>';
      let contextType = 'MyComponent<T>';

      expect(
        templateToTypescript('', { contextType, typeParams, typesPath: '@glint/template' }).result
          ?.code
      ).toMatchInlineSnapshot(`
        "({} as typeof import(\\"@glint/template\\")).template(function<T extends string>(𝚪: import(\\"@glint/template\\").ResolveContext<MyComponent<T>>, χ: typeof import(\\"@glint/template\\")) {
          𝚪; χ;
        }) as unknown"
      `);
    });

    test('given preamble code', () => {
      let preamble = ['console.log("hello!");', 'throw new Error();'];

      expect(templateToTypescript('', { preamble, typesPath: '@glint/template' }).result?.code)
        .toMatchInlineSnapshot(`
        "({} as typeof import(\\"@glint/template\\")).template(function(𝚪, χ: typeof import(\\"@glint/template\\")) {
          console.log(\\"hello!\\");
          throw new Error();
          𝚪; χ;
        })"
      `);
    });
  });

  describe('directives', () => {
    test('in a top-level mustache', () => {
      let template = stripIndent`
        {{! @glint-ignore: this is fine }}
        <Foo as |bar|>
          {{hello}}
        </Foo>
      `;

      let { result, errors } = templateToTypescript(template, { typesPath: '@glint/template' });

      expect(errors).toEqual([]);
      expect(result?.directives).toEqual([
        {
          kind: 'ignore',
          location: {
            start: template.indexOf('{{!'),
            end: template.indexOf('fine }}') + 'fine }}'.length,
          },
          areaOfEffect: {
            start: template.indexOf('<Foo as'),
            end: template.indexOf('|bar|>') + '|bar|>'.length + 1,
          },
        },
      ]);
    });

    test('in an element bobdy', () => {
      let template = stripIndent`
        <Foo
          {{! @glint-ignore: this is fine }}
          @arg="hi"
          as |bar|
        >
          {{hello}}
        </Foo>
      `;

      let { result, errors } = templateToTypescript(template, { typesPath: '@glint/template' });

      expect(errors).toEqual([]);
      expect(result?.directives).toEqual([
        {
          kind: 'ignore',
          location: {
            start: template.indexOf('{{!'),
            end: template.indexOf('fine }}') + 'fine }}'.length,
          },
          areaOfEffect: {
            start: template.indexOf('  @arg='),
            end: template.indexOf('"hi"') + '"hi"'.length + 1,
          },
        },
      ]);
    });

    test('nocheck', () => {
      let template = stripIndent`
        {{! @glint-nocheck: don't check this whole template }}
        <Foo />
        {{foo-bar}}
        {{this.baz}}
      `;

      let { result, errors } = templateToTypescript(template, { typesPath: '@glint/template' });

      expect(errors).toEqual([]);
      expect(result?.directives).toEqual([
        {
          kind: 'ignore',
          location: {
            start: 0,
            end: template.indexOf('template }}') + 'template }}'.length,
          },
          areaOfEffect: {
            start: 0,
            end: template.length -1,
          },
        },
      ]);
      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"Foo\\"])({}));
          𝛄;
        }
        χ.emitValue(χ.resolveOrReturn(χ.Globals[\\"foo-bar\\"])({}));
        χ.emitValue(χ.resolveOrReturn(𝚪.this.baz)({}));"
      `);
    });

    test('expect-error', () => {
      let template = stripIndent`
        {{! @glint-expect-error: this is fine }}
        <Foo as |bar|>
          {{hello}}
        </Foo>
      `;

      let { result, errors } = templateToTypescript(template, { typesPath: '@glint/template' });

      expect(errors).toEqual([]);
      expect(result?.directives).toEqual([
        {
          kind: 'expect-error',
          location: {
            start: template.indexOf('{{!'),
            end: template.indexOf('fine }}') + 'fine }}'.length,
          },
          areaOfEffect: {
            start: template.indexOf('<Foo as'),
            end: template.indexOf('|bar|>') + '|bar|>'.length + 1,
          },
        },
      ]);
    });

    test('unknown type', () => {
      let template = stripIndent`
        {{! @glint-check }}
        <Foo as |bar|>
          {{hello}}
        </Foo>
      `;

      let { result, errors } = templateToTypescript(template, { typesPath: '@glint/template' });

      expect(result?.directives).toEqual([]);
      expect(errors).toEqual([
        {
          message: 'Unknown directive @glint-check',
          location: {
            start: template.indexOf('{{!'),
            end: template.indexOf('}}') + '}}'.length,
          },
        },
      ]);
    });
  });

  describe('primitives', () => {
    describe('{{if}}', () => {
      test('without an alternate', () => {
        let template = '{{if @foo "ok"}}';

        expect(templateBody(template)).toMatchInlineSnapshot(
          `"(𝚪.args.foo) ? (\\"ok\\") : (undefined);"`
        );
      });

      test('with an alternate', () => {
        let template = '{{if @foo "ok" "nope"}}';

        expect(templateBody(template)).toMatchInlineSnapshot(
          `"(𝚪.args.foo) ? (\\"ok\\") : (\\"nope\\");"`
        );
      });
    });

    describe('{{unless}}', () => {
      test('without an alternate', () => {
        let template = '{{unless @foo "ok"}}';

        expect(templateBody(template)).toMatchInlineSnapshot(
          `"!(𝚪.args.foo) ? (\\"ok\\") : (undefined);"`
        );
      });

      test('with an alternate', () => {
        let template = '{{unless @foo "ok" "nope"}}';

        expect(templateBody(template)).toMatchInlineSnapshot(
          `"!(𝚪.args.foo) ? (\\"ok\\") : (\\"nope\\");"`
        );
      });
    });

    describe('{{#if}}', () => {
      test('without an {{else}}', () => {
        let template = stripIndent`
          {{#if @foo}}
            {{@ok}}
          {{/if}}
        `;

        expect(templateBody(template)).toMatchInlineSnapshot(`
          "if (𝚪.args.foo) {
            χ.emitValue(χ.resolveOrReturn(𝚪.args.ok)({}));
          }"
        `);
      });

      test('with an {{else}}', () => {
        let template = stripIndent`
          {{#if @foo}}
            {{@ok}}
          {{else}}
            {{@noGood}}
          {{/if}}
        `;

        expect(templateBody(template)).toMatchInlineSnapshot(`
          "if (𝚪.args.foo) {
            χ.emitValue(χ.resolveOrReturn(𝚪.args.ok)({}));
          } else {
            χ.emitValue(χ.resolveOrReturn(𝚪.args.noGood)({}));
          }"
        `);
      });

      test('with {{else if ...}}', () => {
        let template = stripIndent`
          {{#if @foo}}
            {{@ok}}
          {{else if @bar}}
            {{@noGood}}
          {{else}}
            {{@done}}
          {{/if}}
        `;

        expect(templateBody(template)).toMatchInlineSnapshot(`
          "if (𝚪.args.foo) {
            χ.emitValue(χ.resolveOrReturn(𝚪.args.ok)({}));
          } else {
            if (𝚪.args.bar) {
              χ.emitValue(χ.resolveOrReturn(𝚪.args.noGood)({}));
            } else {
              χ.emitValue(χ.resolveOrReturn(𝚪.args.done)({}));
            }
          }"
        `);
      });

      test('with {{else someOtherIdentifier}}', () => {
        let template = stripIndent`
          {{#if @foo}}
            {{@ok}}
          {{else doAThing as |ok|}}
            {{ok}}
          {{else}}
            {{@nevermind}}
          {{/if}}
        `;

        expect(templateBody(template)).toMatchInlineSnapshot(`
          "if (𝚪.args.foo) {
            χ.emitValue(χ.resolveOrReturn(𝚪.args.ok)({}));
          } else {
            {
              const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"doAThing\\"])({}));
              {
                const [ok] = 𝛄.blockParams[\\"default\\"];
                χ.emitValue(χ.resolveOrReturn(ok)({}));
              }
              {
                const [] = 𝛄.blockParams[\\"else\\"];
                χ.emitValue(χ.resolveOrReturn(𝚪.args.nevermind)({}));
              }
              χ.Globals[\\"doAThing\\"];
            }
          }"
        `);
      });
    });

    describe('{{#unless}}', () => {
      test('without an {{else}}', () => {
        let template = stripIndent`
          {{#unless @foo}}
            {{@ok}}
          {{/unless}}
        `;

        expect(templateBody(template)).toMatchInlineSnapshot(`
          "if (!(𝚪.args.foo)) {
            χ.emitValue(χ.resolveOrReturn(𝚪.args.ok)({}));
          }"
        `);
      });

      test('with an {{else}}', () => {
        let template = stripIndent`
          {{#unless @foo}}
            {{@ok}}
          {{else}}
            {{@noGood}}
          {{/unless}}
        `;

        expect(templateBody(template)).toMatchInlineSnapshot(`
          "if (!(𝚪.args.foo)) {
            χ.emitValue(χ.resolveOrReturn(𝚪.args.ok)({}));
          } else {
            χ.emitValue(χ.resolveOrReturn(𝚪.args.noGood)({}));
          }"
        `);
      });
    });

    describe('{{yield}}', () => {
      test('default {{yield}}', () => {
        let template = stripIndent`
          {{yield 123 this.message}}
        `;

        expect(templateBody(template)).toMatchInlineSnapshot(
          `"χ.yieldToBlock(𝚪, \\"default\\", 123, 𝚪.this.message);"`
        );
      });

      test('{{yield}} to a named block', () => {
        let template = stripIndent`
          {{yield 123 to="body"}}
        `;

        expect(templateBody(template)).toMatchInlineSnapshot(
          `"χ.yieldToBlock(𝚪, \\"body\\", 123);"`
        );
      });

      test('{{yield}} to else', () => {
        let template = stripIndent`
          {{yield 123 to="else"}}
        `;

        expect(templateBody(template)).toMatchInlineSnapshot(
          `"χ.yieldToBlock(𝚪, \\"else\\", 123);"`
        );
      });

      test('{{yield}} to inverse', () => {
        let template = stripIndent`
          {{yield 123 to="inverse"}}
        `;

        expect(templateBody(template)).toMatchInlineSnapshot(
          `"χ.yieldToBlock(𝚪, \\"else\\", 123);"`
        );
      });
    });

    describe('{{array}}', () => {
      test('without values', () => {
        let template = stripIndent`
          {{array}}
        `;

        expect(templateBody(template)).toMatchInlineSnapshot(`"[];"`);
      });

      test('with values', () => {
        let template = stripIndent`
          {{array 1 true "free"}}
        `;

        expect(templateBody(template)).toMatchInlineSnapshot(`"[1, true, \\"free\\"];"`);
      });

      test('within a subexpression', () => {
        let template = stripIndent`
          {{log (array 1 true "free")}}
        `;

        expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(
          `"χ.emitValue(χ.resolve(log)({}, [1, true, \\"free\\"]));"`
        );
      });
    });

    describe('{{hash}}', () => {
      test('without values', () => {
        let template = stripIndent`
          {{hash}}
        `;

        expect(templateBody(template)).toMatchInlineSnapshot(`"{};"`);
      });

      test('with values', () => {
        let template = stripIndent`
          {{hash a=1 b="ok"}}
        `;

        expect(templateBody(template)).toMatchInlineSnapshot(`
          "({
            a: 1,
            b: \\"ok\\",
          });"
        `);
      });

      test('within a subexpression', () => {
        let template = stripIndent`
          {{log (hash a=1 b="ok")}}
        `;

        expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
          "χ.emitValue(χ.resolve(log)({}, ({
            a: 1,
            b: \\"ok\\",
          })));"
        `);
      });
    });
  });

  describe('inline curlies', () => {
    describe('paths', () => {
      describe('path types', () => {
        test('out-of-scope identifier', () => {
          let template = '{{message}}';

          expect(templateBody(template)).toMatchInlineSnapshot(
            `"χ.emitValue(χ.resolveOrReturn(χ.Globals[\\"message\\"])({}));"`
          );
        });

        test('in-scope identifier', () => {
          let template = '{{message}}';

          expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(
            `"χ.emitValue(χ.resolveOrReturn(message)({}));"`
          );
        });

        test('chained path', () => {
          let template = '{{obj.foo.bar}}';

          expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(
            `"χ.emitValue(χ.resolveOrReturn(obj?.foo?.bar)({}));"`
          );
        });

        test('chained path with a spinal-case key', () => {
          let template = '{{obj.foo-bar.baz}}';

          expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(
            `"χ.emitValue(χ.resolveOrReturn(obj?.[\\"foo-bar\\"]?.baz)({}));"`
          );
        });

        test('`this` path', () => {
          let template = '{{this}}';

          expect(templateBody(template)).toMatchInlineSnapshot(
            `"χ.emitValue(χ.resolveOrReturn(𝚪.this)({}));"`
          );
        });

        test('chained `this` path', () => {
          let template = '{{this.foo.bar}}';

          expect(templateBody(template)).toMatchInlineSnapshot(
            `"χ.emitValue(χ.resolveOrReturn(𝚪.this.foo?.bar)({}));"`
          );
        });

        test('chained `this` path with a spinal-case key', () => {
          let template = '{{this.foo-bar}}';

          expect(templateBody(template)).toMatchInlineSnapshot(
            `"χ.emitValue(χ.resolveOrReturn(𝚪.this[\\"foo-bar\\"])({}));"`
          );
        });

        test('`@arg` path', () => {
          let template = '{{@foo}}';

          expect(templateBody(template)).toMatchInlineSnapshot(
            `"χ.emitValue(χ.resolveOrReturn(𝚪.args.foo)({}));"`
          );
        });

        test('`@arg` path with a spinal-case name', () => {
          let template = '{{@foo-bar}}';

          expect(templateBody(template)).toMatchInlineSnapshot(
            `"χ.emitValue(χ.resolveOrReturn(𝚪.args[\\"foo-bar\\"])({}));"`
          );
        });

        test('passed as an attr', () => {
          let template = '<Foo data-bar={{helper param=true}} />';

          expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
            "{
              const 𝛄 = χ.emitComponent(χ.resolve(Foo)({}));
              χ.applyAttributes(𝛄.element, {
                \\"data-bar\\": χ.emitValue(χ.resolve(helper)({ param: true })),
              });
            }"
          `);
        });

        test('passed as an @arg', () => {
          let template = '<Foo @bar={{helper param=true}} />';

          expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
            "{
              const 𝛄 = χ.emitComponent(χ.resolve(Foo)({ bar: χ.resolve(helper)({ param: true }) }));
              𝛄;
            }"
          `);
        });
      });

      describe('path locations', () => {
        test('top-level', () => {
          let template = '{{@input}}';

          expect(templateBody(template)).toMatchInlineSnapshot(
            `"χ.emitValue(χ.resolveOrReturn(𝚪.args.input)({}));"`
          );
        });

        test('passed to an attribute', () => {
          let template = '<div data-attr={{@input}}></div>';

          expect(templateBody(template)).toMatchInlineSnapshot(`
            "{
              const 𝛄 = χ.emitElement(\\"div\\");
              χ.applyAttributes(𝛄.element, {
                \\"data-attr\\": χ.emitValue(χ.resolveOrReturn(𝚪.args.input)({})),
              });
            }"
          `);
        });

        test('in a concat statement', () => {
          let template = '<div data-attr="hello, {{@input}}"></div>';

          expect(templateBody(template)).toMatchInlineSnapshot(`
            "{
              const 𝛄 = χ.emitElement(\\"div\\");
              χ.applyAttributes(𝛄.element, {
                \\"data-attr\\": \`\${χ.emitValue(χ.resolveOrReturn(𝚪.args.input)({}))}\`,
              });
            }"
          `);
        });

        test('as an @arg value', () => {
          let template = '<Greet @message={{@arg}} />';

          expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
            "{
              const 𝛄 = χ.emitComponent(χ.resolve(Greet)({ message: 𝚪.args.arg }));
              𝛄;
            }"
          `);
        });

        // `@glimmer/syntax` doesn't accept this yet, though it will be required
        // for template strict mode to invoke param-less helpers passed as args
        test.skip('as a subexpression', () => {
          let template = '{{(@foo)}}';

          expect(templateBody(template)).toMatchInlineSnapshot();
        });
      });
    });

    describe('literals', () => {
      test('{{true}}', () => {
        expect(templateBody('{{true}}')).toMatchInlineSnapshot(`"true;"`);
      });

      test('{{false}}', () => {
        expect(templateBody('{{false}}')).toMatchInlineSnapshot(`"false;"`);
      });

      test('{{null}}', () => {
        expect(templateBody('{{null}}')).toMatchInlineSnapshot(`"null;"`);
      });

      test('{{undefined}}', () => {
        expect(templateBody('{{undefined}}')).toMatchInlineSnapshot(`"undefined;"`);
      });

      test('numbers', () => {
        expect(templateBody('{{123}}')).toMatchInlineSnapshot(`"123;"`);
      });

      test('strings', () => {
        expect(templateBody('{{"hello"}}')).toMatchInlineSnapshot(`"\\"hello\\";"`);
      });
    });

    describe('helper and inline-curly component invocations', () => {
      test('positional params', () => {
        let template = '{{doSomething "hello" 123}}';

        expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(
          `"χ.emitValue(χ.resolve(doSomething)({}, \\"hello\\", 123));"`
        );
      });

      test('named params', () => {
        let template = '{{doSomething a=123 b="ok"}}';

        expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(
          `"χ.emitValue(χ.resolve(doSomething)({ a: 123, b: \\"ok\\" }));"`
        );
      });

      test('named and positional params', () => {
        let template = '{{doSomething "one" true 3 four=4}}';

        expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(
          `"χ.emitValue(χ.resolve(doSomething)({ four: 4 }, \\"one\\", true, 3));"`
        );
      });
    });
  });

  describe('modifiers', () => {
    test('on a plain element', () => {
      let template = `<div {{modifier foo="bar"}}></div>`;

      expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitElement(\\"div\\");
          χ.applyModifier(𝛄.element, χ.resolve(modifier)({ foo: \\"bar\\" }));
        }"
      `);
    });

    test('on a component', () => {
      let template = `<MyComponent {{modifier foo="bar"}}/>`;

      expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitComponent(χ.resolve(MyComponent)({}));
          χ.applyModifier(𝛄.element, χ.resolve(modifier)({ foo: \\"bar\\" }));
        }"
      `);
    });
  });

  describe('subexpressions', () => {
    test('resolution', () => {
      let template = `<div data-attr={{concat (foo 1) (foo true)}}></div>`;

      expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitElement(\\"div\\");
          χ.applyAttributes(𝛄.element, {
            \\"data-attr\\": χ.emitValue(χ.resolve(concat)({}, χ.resolve(foo)({}, 1), χ.resolve(foo)({}, true))),
          });
        }"
      `);
    });
  });

  describe('block curlies', () => {
    test('invocation with a default block', () => {
      let template = stripIndent`
        {{#foo as |bar baz|}}
          {{bar}}: {{baz}}
        {{/foo}}
      `;

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"foo\\"])({}));
          {
            const [bar, baz] = 𝛄.blockParams[\\"default\\"];
            χ.emitValue(χ.resolveOrReturn(bar)({}));
            χ.emitValue(χ.resolveOrReturn(baz)({}));
          }
          χ.Globals[\\"foo\\"];
        }"
      `);
    });

    test('invocation with an else block', () => {
      let template = stripIndent`
        {{#foo as |bar baz|}}
          {{bar}}: {{baz}}
        {{else}}
          {{@oh}}
        {{/foo}}
      `;

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"foo\\"])({}));
          {
            const [bar, baz] = 𝛄.blockParams[\\"default\\"];
            χ.emitValue(χ.resolveOrReturn(bar)({}));
            χ.emitValue(χ.resolveOrReturn(baz)({}));
          }
          {
            const [] = 𝛄.blockParams[\\"else\\"];
            χ.emitValue(χ.resolveOrReturn(𝚪.args.oh)({}));
          }
          χ.Globals[\\"foo\\"];
        }"
      `);
    });

    test('chained else', () => {
      let template = stripIndent`
        {{#foo as |bar baz|}}
          {{bar}}: {{baz}}
        {{else}}
          {{@oh}}
        {{/foo}}
      `;

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"foo\\"])({}));
          {
            const [bar, baz] = 𝛄.blockParams[\\"default\\"];
            χ.emitValue(χ.resolveOrReturn(bar)({}));
            χ.emitValue(χ.resolveOrReturn(baz)({}));
          }
          {
            const [] = 𝛄.blockParams[\\"else\\"];
            χ.emitValue(χ.resolveOrReturn(𝚪.args.oh)({}));
          }
          χ.Globals[\\"foo\\"];
        }"
      `);
    });
  });

  describe('plain elements', () => {
    test('with programmatic contents', () => {
      let template = '<div>{{@foo}}</div>';

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitElement(\\"div\\");
          𝛄;
          χ.emitValue(χ.resolveOrReturn(𝚪.args.foo)({}));
        }"
      `);
    });

    test('with mustache attrs', () => {
      let template = '<div data-foo={{@foo}}></div>';

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitElement(\\"div\\");
          χ.applyAttributes(𝛄.element, {
            \\"data-foo\\": χ.emitValue(χ.resolveOrReturn(𝚪.args.foo)({})),
          });
        }"
      `);
    });

    test('with interpolated attrs', () => {
      let template = '<div data-foo="value-{{@foo}}-{{@bar}}"></div>';

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitElement(\\"div\\");
          χ.applyAttributes(𝛄.element, {
            \\"data-foo\\": \`\${χ.emitValue(χ.resolveOrReturn(𝚪.args.foo)({}))}\${χ.emitValue(χ.resolveOrReturn(𝚪.args.bar)({}))}\`,
          });
        }"
      `);
    });

    test('with splattributes', () => {
      let template = '<div ...attributes></div>';

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitElement(\\"div\\");
          χ.applySplattributes(𝚪.element, 𝛄.element);
        }"
      `);
    });
  });

  describe('angle bracket components', () => {
    test('self-closing', () => {
      let template = `<Foo @bar="hello" />`;

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"Foo\\"])({ bar: \\"hello\\" }));
          𝛄;
        }"
      `);
    });

    test('with a default block', () => {
      let template = stripIndent`
        <Foo as |bar|>
          {{bar}}
        </Foo>
      `;

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"Foo\\"])({}));
          𝛄;
          {
            const [bar] = 𝛄.blockParams[\\"default\\"];
            χ.emitValue(χ.resolveOrReturn(bar)({}));
          }
          χ.Globals[\\"Foo\\"];
        }"
      `);
    });

    test('with splattributes', () => {
      let template = '<Foo ...attributes />';

      expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitComponent(χ.resolve(Foo)({}));
          χ.applySplattributes(𝚪.element, 𝛄.element);
        }"
      `);
    });

    test('with a path for a name', () => {
      let template = '<foo.bar @arg="hello" />';

      expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitComponent(χ.resolve(foo?.bar)({ arg: \\"hello\\" }));
          𝛄;
        }"
      `);
    });

    test('with an @arg for a name', () => {
      let template = '<@foo @arg="hello" />';

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitComponent(χ.resolve(𝚪.args.foo)({ arg: \\"hello\\" }));
          𝛄;
        }"
      `);
    });

    test('with a `this` path for a name', () => {
      let template = '<this.foo @arg="hello" />';

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitComponent(χ.resolve(𝚪.this.foo)({ arg: \\"hello\\" }));
          𝛄;
        }"
      `);
    });

    test('with named blocks', () => {
      let template = stripIndent`
        <Foo>
          <:head as |h|>
            {{h}}
          </:head>

          <:body as |b|>
            <b.contents>Hello!</b.contents>
          </:body>
        </Foo>
      `;

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"Foo\\"])({}));
          𝛄;
          {
            const [h] = 𝛄.blockParams[\\"head\\"];
            χ.emitValue(χ.resolveOrReturn(h)({}));
          }
          {
            const [b] = 𝛄.blockParams[\\"body\\"];
            {
              const 𝛄 = χ.emitComponent(χ.resolve(b?.contents)({}));
              𝛄;
              {
                const [] = 𝛄.blockParams[\\"default\\"];
              }
              b?.contents;
            }
          }
          χ.Globals[\\"Foo\\"];
        }"
      `);
    });

    test('with concat args', () => {
      let template = `<Foo @arg="bar-{{baz}}" />`;

      expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitComponent(χ.resolve(Foo)({ arg: \`\${χ.emitValue(χ.resolveOrReturn(baz)({}))}\` }));
          𝛄;
        }"
      `);
    });

    test('with yielded component', () => {
      let template = stripIndent`
        <Foo as |NS|>
          <NS.Nested.Custom class="foo" />
        </Foo>
      `;

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
          const 𝛄 = χ.emitComponent(χ.resolve(χ.Globals[\\"Foo\\"])({}));
          𝛄;
          {
            const [NS] = 𝛄.blockParams[\\"default\\"];
            {
              const 𝛄 = χ.emitComponent(χ.resolve(NS?.Nested?.Custom)({}));
              χ.applyAttributes(𝛄.element, {
                class: \\"foo\\",
              });
            }
          }
          χ.Globals[\\"Foo\\"];
        }"
      `);
    });
  });

  describe('error conditions', () => {
    test('Handlebars syntax error', () => {
      let { errors } = templateToTypescript('<Foo @attr={{"123}} />', {
        typesPath: '@glint/template',
      });

      expect(errors).toEqual([
        {
          location: { start: 11, end: 13 },
          message: stripIndent`
            Parse error on line 1:
            <Foo @attr={{\"123}} />
            -------------^
            Expecting 'ID', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'
          `,
        },
      ]);
    });

    test('HTML syntax error', () => {
      let { errors } = templateToTypescript('<Foo </Foo>', {
        typesPath: '@glint/template',
      });

      expect(errors).toEqual([
        {
          location: { start: 5, end: 5 },
          message:
            "< is not a valid character within attribute names: (error occurred in 'an unknown module' @ line 1 : column 5)",
        },
      ]);
    });

    test('{{yield}} in expression position', () => {
      let { errors } = templateToTypescript('<Foo @attr={{yield}} />', {
        typesPath: '@glint/template',
      });

      expect(errors).toEqual([
        {
          message: '{{yield}} may only appear as a top-level statement',
          location: { start: 11, end: 20 },
        },
      ]);
    });

    test('{{yield}} to a dynamic named block', () => {
      let { errors } = templateToTypescript('{{yield to=@blockName}}', {
        typesPath: '@glint/template',
      });

      expect(errors).toEqual([
        {
          message: 'Named block {{yield}}s must have a literal block name',
          location: { start: 0, end: 23 },
        },
      ]);
    });

    test('{{hash}} with positional parameters', () => {
      let { errors } = templateToTypescript('<Foo @attr={{hash 123 foo="bar"}} />', {
        typesPath: '@glint/template',
      });

      expect(errors).toEqual([
        {
          message: '{{hash}} only accepts named parameters',
          location: { start: 11, end: 33 },
        },
      ]);
    });

    test('{{array}} with named parameters', () => {
      let { errors } = templateToTypescript('<Foo @attr={{array 123 foo="bar"}} />', {
        typesPath: '@glint/template',
      });

      expect(errors).toEqual([
        {
          message: '{{array}} only accepts positional parameters',
          location: { start: 11, end: 34 },
        },
      ]);
    });

    test('inline {{if}} with no consequent', () => {
      let { errors } = templateToTypescript('<Foo @attr={{if true}} />', {
        typesPath: '@glint/template',
      });

      expect(errors).toEqual([
        {
          message: '{{if}} requires at least two parameters',
          location: { start: 11, end: 22 },
        },
      ]);
    });

    test('block {{#if}} with no condition', () => {
      let { errors } = templateToTypescript(
        stripIndent`
          {{#if}}
            hello!
          {{/if}}
        `,
        { typesPath: '@glint/template' }
      );

      expect(errors).toEqual([
        {
          message: '{{#if}} requires exactly one condition',
          location: { start: 0, end: 24 },
        },
      ]);
    });

    test('named blocks mixed with other content', () => {
      let { errors } = templateToTypescript(
        stripIndent`
          Header content
          <Component>
            hello
            <:block></:block>

            goodbye

            <:other></:other>
          </Component>
          Footer content
        `,
        { typesPath: '@glint/template' }
      );

      expect(errors).toEqual([
        {
          message: 'Named blocks may not be mixed with other content',
          location: { start: 29, end: 34 },
        },
        {
          message: 'Named blocks may not be mixed with other content',
          location: { start: 58, end: 65 },
        },
      ]);
    });

    test('invalid block param name', () => {
      // This is valid HBS, but complex for us to support. Since it's only a
      // local identifier, the author has full discretion over how to name it.
      let { errors } = templateToTypescript(
        stripIndent`
          <Component as |foo-bar|>
            {{foo-bar}}
          </Component>
        `,
        { typesPath: '@glint/template' }
      );

      expect(errors).toEqual([
        {
          message: 'Block params must be valid TypeScript identifiers',
          location: { start: 0, end: 51 },
        },
      ]);
    });
  });
});
