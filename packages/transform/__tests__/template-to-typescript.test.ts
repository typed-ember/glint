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
      .slice(3, -3)
      .join('\n')
      .replace(/(^|\n) {4}/g, '$1');
  }

  describe('template boilerplate', () => {
    test('without any specified type parameters or context type', () => {
      expect(templateToTypescript('', { typesPath: '@glint/template' }).result?.code)
        .toMatchInlineSnapshot(`
        "(() => {
          let χ!: typeof import(\\"@glint/template\\");
          return χ.template(function(𝚪: import(\\"@glint/template\\").ResolveContext<unknown>) {
            𝚪;
          });
        })()"
      `);
    });

    test('given type parameters and context type', () => {
      let typeParams = '<T extends string>';
      let contextType = 'MyComponent<T>';

      expect(
        templateToTypescript('', { contextType, typeParams, typesPath: '@glint/template' }).result
          ?.code
      ).toMatchInlineSnapshot(`
        "(() => {
          let χ!: typeof import(\\"@glint/template\\");
          return χ.template(function<T extends string>(𝚪: import(\\"@glint/template\\").ResolveContext<MyComponent<T>>) {
            𝚪;
          });
        })()"
      `);
    });

    test('given preamble code', () => {
      let preamble = ['console.log("hello!");', 'throw new Error();'];

      expect(templateToTypescript('', { preamble, typesPath: '@glint/template' }).result?.code)
        .toMatchInlineSnapshot(`
        "(() => {
          console.log(\\"hello!\\");
          throw new Error();
          let χ!: typeof import(\\"@glint/template\\");
          return χ.template(function(𝚪: import(\\"@glint/template\\").ResolveContext<unknown>) {
            𝚪;
          });
        })()"
      `);
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
            χ.invokeEmit(χ.resolveOrReturn(𝚪.args.ok)({}));
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
            χ.invokeEmit(χ.resolveOrReturn(𝚪.args.ok)({}));
          } else {
            χ.invokeEmit(χ.resolveOrReturn(𝚪.args.noGood)({}));
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
            χ.invokeEmit(χ.resolveOrReturn(𝚪.args.ok)({}));
          } else {
            if (𝚪.args.bar) {
              χ.invokeEmit(χ.resolveOrReturn(𝚪.args.noGood)({}));
            } else {
              χ.invokeEmit(χ.resolveOrReturn(𝚪.args.done)({}));
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
            χ.invokeEmit(χ.resolveOrReturn(𝚪.args.ok)({}));
          } else {
            χ.invokeBlock(χ.resolve(χ.Globals[\\"doAThing\\"])({}), {
              default(ok) {
                χ.invokeEmit(χ.resolveOrReturn(ok)({}));
              },
              inverse() {
                χ.invokeEmit(χ.resolveOrReturn(𝚪.args.nevermind)({}));
              },
            });
            χ.Globals[\\"doAThing\\"];
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
            χ.invokeEmit(χ.resolveOrReturn(𝚪.args.ok)({}));
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
            χ.invokeEmit(χ.resolveOrReturn(𝚪.args.ok)({}));
          } else {
            χ.invokeEmit(χ.resolveOrReturn(𝚪.args.noGood)({}));
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

        expect(templateBody(template, { identifiersInScope: ['log'] })).toMatchInlineSnapshot(
          `"χ.invokeEmit(χ.resolve(log)({}, [1, true, \\"free\\"]));"`
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

        expect(templateBody(template, { identifiersInScope: ['log'] })).toMatchInlineSnapshot(`
          "χ.invokeEmit(χ.resolve(log)({}, ({
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
            `"χ.invokeEmit(χ.resolveOrReturn(χ.Globals[\\"message\\"])({}));"`
          );
        });

        test('in-scope identifier', () => {
          let identifiersInScope = ['message'];
          let template = '{{message}}';

          expect(templateBody(template, { identifiersInScope })).toMatchInlineSnapshot(
            `"χ.invokeEmit(χ.resolveOrReturn(message)({}));"`
          );
        });

        test('chained path', () => {
          let identifiersInScope = ['obj'];
          let template = '{{obj.foo.bar}}';

          expect(templateBody(template, { identifiersInScope })).toMatchInlineSnapshot(
            `"χ.invokeEmit(χ.resolveOrReturn(obj?.foo?.bar)({}));"`
          );
        });

        test('chained path with a spinal-case key', () => {
          let identifiersInScope = ['obj'];
          let template = '{{obj.foo-bar.baz}}';

          expect(templateBody(template, { identifiersInScope })).toMatchInlineSnapshot(
            `"χ.invokeEmit(χ.resolveOrReturn(obj?.[\\"foo-bar\\"]?.baz)({}));"`
          );
        });

        test('`this` path', () => {
          let template = '{{this}}';

          expect(templateBody(template)).toMatchInlineSnapshot(
            `"χ.invokeEmit(χ.resolveOrReturn(𝚪.this)({}));"`
          );
        });

        test('chained `this` path', () => {
          let template = '{{this.foo.bar}}';

          expect(templateBody(template)).toMatchInlineSnapshot(
            `"χ.invokeEmit(χ.resolveOrReturn(𝚪.this.foo?.bar)({}));"`
          );
        });

        test('`@arg` path', () => {
          let template = '{{@foo}}';

          expect(templateBody(template)).toMatchInlineSnapshot(
            `"χ.invokeEmit(χ.resolveOrReturn(𝚪.args.foo)({}));"`
          );
        });

        test('passed as an attr', () => {
          let identifiersInScope = ['Foo', 'helper'];
          let template = '<Foo data-bar={{helper param=true}} />';

          expect(templateBody(template, { identifiersInScope })).toMatchInlineSnapshot(`
            "χ.applyAttributes<import(\\"@glint/template\\").ElementForComponent<typeof Foo>>({
              \\"data-bar\\": χ.invokeEmit(χ.resolve(helper)({ param: true })),
            });
            χ.invokeBlock(χ.resolve(Foo)({}), {});"
          `);
        });

        test('passed as an @arg', () => {
          let identifiersInScope = ['Foo', 'helper'];
          let template = '<Foo @bar={{helper param=true}} />';

          expect(templateBody(template, { identifiersInScope })).toMatchInlineSnapshot(
            `"χ.invokeBlock(χ.resolve(Foo)({ bar: χ.resolve(helper)({ param: true }) }), {});"`
          );
        });
      });

      describe('path locations', () => {
        test('top-level', () => {
          let template = '{{@input}}';

          expect(templateBody(template)).toMatchInlineSnapshot(
            `"χ.invokeEmit(χ.resolveOrReturn(𝚪.args.input)({}));"`
          );
        });

        test('passed to an attribute', () => {
          let template = '<div data-attr={{@input}}></div>';

          expect(templateBody(template)).toMatchInlineSnapshot(`
            "χ.applyAttributes<import(\\"@glint/template\\").ElementForTagName<\\"div\\">>({
              \\"data-attr\\": χ.invokeEmit(χ.resolveOrReturn(𝚪.args.input)({})),
            });"
          `);
        });

        test('in a concat statement', () => {
          let template = '<div data-attr="hello, {{@input}}"></div>';

          expect(templateBody(template)).toMatchInlineSnapshot(`
            "χ.applyAttributes<import(\\"@glint/template\\").ElementForTagName<\\"div\\">>({
              \\"data-attr\\": \`\${χ.invokeEmit(χ.resolveOrReturn(𝚪.args.input)({}))}\`,
            });"
          `);
        });

        test('as an @arg value', () => {
          let identifiersInScope = ['Greet'];
          let template = '<Greet @message={{@arg}} />';

          expect(templateBody(template, { identifiersInScope })).toMatchInlineSnapshot(
            `"χ.invokeBlock(χ.resolve(Greet)({ message: 𝚪.args.arg }), {});"`
          );
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
        let identifiersInScope = ['doSomething'];
        let template = '{{doSomething "hello" 123}}';

        expect(templateBody(template, { identifiersInScope })).toMatchInlineSnapshot(
          `"χ.invokeEmit(χ.resolve(doSomething)({}, \\"hello\\", 123));"`
        );
      });

      test('named params', () => {
        let identifiersInScope = ['doSomething'];
        let template = '{{doSomething a=123 b="ok"}}';

        expect(templateBody(template, { identifiersInScope })).toMatchInlineSnapshot(
          `"χ.invokeEmit(χ.resolve(doSomething)({ a: 123, b: \\"ok\\" }));"`
        );
      });

      test('named and positional params', () => {
        let identifiersInScope = ['doSomething'];
        let template = '{{doSomething "one" true 3 four=4}}';

        expect(templateBody(template, { identifiersInScope })).toMatchInlineSnapshot(
          `"χ.invokeEmit(χ.resolve(doSomething)({ four: 4 }, \\"one\\", true, 3));"`
        );
      });
    });
  });

  describe('modifiers', () => {
    test('on a plain element', () => {
      let identifiersInScope = ['modifier'];
      let template = `<div {{modifier foo="bar"}}></div>`;

      expect(templateBody(template, { identifiersInScope })).toMatchInlineSnapshot(
        `"χ.applyModifier<import(\\"@glint/template\\").ElementForTagName<\\"div\\">>(χ.resolve(modifier)({ foo: \\"bar\\" }));"`
      );
    });

    test('on a component', () => {
      let identifiersInScope = ['MyComponent', 'modifier'];
      let template = `<MyComponent {{modifier foo="bar"}}/>`;

      expect(templateBody(template, { identifiersInScope })).toMatchInlineSnapshot(`
        "χ.applyModifier<import(\\"@glint/template\\").ElementForComponent<typeof MyComponent>>(χ.resolve(modifier)({ foo: \\"bar\\" }));
        χ.invokeBlock(χ.resolve(MyComponent)({}), {});"
      `);
    });
  });

  describe('subexpressions', () => {
    test('resolution', () => {
      let identifiersInScope = ['concat', 'foo'];
      let template = `<div data-attr={{concat (foo 1) (foo true)}}></div>`;

      expect(templateBody(template, { identifiersInScope })).toMatchInlineSnapshot(`
        "χ.applyAttributes<import(\\"@glint/template\\").ElementForTagName<\\"div\\">>({
          \\"data-attr\\": χ.invokeEmit(χ.resolve(concat)({}, χ.resolve(foo)({}, 1), χ.resolve(foo)({}, true))),
        });"
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
        "χ.invokeBlock(χ.resolve(χ.Globals[\\"foo\\"])({}), {
          default(bar, baz) {
            χ.invokeEmit(χ.resolveOrReturn(bar)({}));
            χ.invokeEmit(χ.resolveOrReturn(baz)({}));
          },
        });
        χ.Globals[\\"foo\\"];"
      `);
    });

    test('invocation with an inverse block', () => {
      let template = stripIndent`
        {{#foo as |bar baz|}}
          {{bar}}: {{baz}}
        {{else}}
          {{@oh}}
        {{/foo}}
      `;

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "χ.invokeBlock(χ.resolve(χ.Globals[\\"foo\\"])({}), {
          default(bar, baz) {
            χ.invokeEmit(χ.resolveOrReturn(bar)({}));
            χ.invokeEmit(χ.resolveOrReturn(baz)({}));
          },
          inverse() {
            χ.invokeEmit(χ.resolveOrReturn(𝚪.args.oh)({}));
          },
        });
        χ.Globals[\\"foo\\"];"
      `);
    });

    test('chained inverse', () => {
      let template = stripIndent`
        {{#foo as |bar baz|}}
          {{bar}}: {{baz}}
        {{else}}
          {{@oh}}
        {{/foo}}
      `;

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "χ.invokeBlock(χ.resolve(χ.Globals[\\"foo\\"])({}), {
          default(bar, baz) {
            χ.invokeEmit(χ.resolveOrReturn(bar)({}));
            χ.invokeEmit(χ.resolveOrReturn(baz)({}));
          },
          inverse() {
            χ.invokeEmit(χ.resolveOrReturn(𝚪.args.oh)({}));
          },
        });
        χ.Globals[\\"foo\\"];"
      `);
    });
  });

  describe('plain elements', () => {
    test('with programmatic contents', () => {
      let template = '<div>{{@foo}}</div>';

      expect(templateBody(template)).toMatchInlineSnapshot(
        `"χ.invokeEmit(χ.resolveOrReturn(𝚪.args.foo)({}));"`
      );
    });

    test('with mustache attrs', () => {
      let template = '<div data-foo={{@foo}}></div>';

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "χ.applyAttributes<import(\\"@glint/template\\").ElementForTagName<\\"div\\">>({
          \\"data-foo\\": χ.invokeEmit(χ.resolveOrReturn(𝚪.args.foo)({})),
        });"
      `);
    });

    test('with interpolated attrs', () => {
      let template = '<div data-foo="value-{{@foo}}-{{@bar}}"></div>';

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "χ.applyAttributes<import(\\"@glint/template\\").ElementForTagName<\\"div\\">>({
          \\"data-foo\\": \`\${χ.invokeEmit(χ.resolveOrReturn(𝚪.args.foo)({}))}\${χ.invokeEmit(χ.resolveOrReturn(𝚪.args.bar)({}))}\`,
        });"
      `);
    });

    test('with splattributes', () => {
      let template = '<div ...attributes></div>';

      expect(templateBody(template)).toMatchInlineSnapshot(
        `"χ.applySplattributes<typeof 𝚪.element, import(\\"@glint/template\\").ElementForTagName<\\"div\\">>();"`
      );
    });
  });

  describe('angle bracket components', () => {
    test('self-closing', () => {
      let template = `<Foo @bar="hello" />`;

      expect(templateBody(template)).toMatchInlineSnapshot(
        `"χ.invokeBlock(χ.resolve(χ.Globals[\\"Foo\\"])({ bar: \\"hello\\" }), {});"`
      );
    });

    test('with a default block', () => {
      let template = stripIndent`
        <Foo as |bar|>
          {{bar}}
        </Foo>
      `;

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "χ.invokeBlock(χ.resolve(χ.Globals[\\"Foo\\"])({}), {
          default(bar) {
            χ.invokeEmit(χ.resolveOrReturn(bar)({}));
          },
        });
        χ.Globals[\\"Foo\\"];"
      `);
    });

    test('with splattributes', () => {
      let identifiersInScope = ['Foo'];
      let template = '<Foo ...attributes />';

      expect(templateBody(template, { identifiersInScope })).toMatchInlineSnapshot(`
        "χ.applySplattributes<typeof 𝚪.element, import(\\"@glint/template\\").ElementForComponent<typeof Foo>>();
        χ.invokeBlock(χ.resolve(Foo)({}), {});"
      `);
    });

    test('with a path for a name', () => {
      let identifiersInScope = ['foo'];
      let template = '<foo.bar @arg="hello" />';

      expect(templateBody(template, { identifiersInScope })).toMatchInlineSnapshot(
        `"χ.invokeBlock(χ.resolve(foo?.bar)({ arg: \\"hello\\" }), {});"`
      );
    });

    test('with an @arg for a name', () => {
      let template = '<@foo @arg="hello" />';

      expect(templateBody(template)).toMatchInlineSnapshot(
        `"χ.invokeBlock(χ.resolve(𝚪.args.foo)({ arg: \\"hello\\" }), {});"`
      );
    });

    test('with a `this` path for a name', () => {
      let template = '<this.foo @arg="hello" />';

      expect(templateBody(template)).toMatchInlineSnapshot(
        `"χ.invokeBlock(χ.resolve(𝚪.this.foo)({ arg: \\"hello\\" }), {});"`
      );
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
        "χ.invokeBlock(χ.resolve(χ.Globals[\\"Foo\\"])({}), {
          head(h) {
            χ.invokeEmit(χ.resolveOrReturn(h)({}));
          },
          body(b) {
            χ.invokeBlock(χ.resolve(b?.contents)({}), {
              default() {
              },
            });
            b?.contents;
          },
        });
        χ.Globals[\\"Foo\\"];"
      `);
    });

    test('with concat args', () => {
      let identifiersInScope = ['Foo', 'baz'];
      let template = `<Foo @arg="bar-{{baz}}" />`;

      expect(templateBody(template, { identifiersInScope })).toMatchInlineSnapshot(
        `"χ.invokeBlock(χ.resolve(Foo)({ arg: \`\${χ.invokeEmit(χ.resolveOrReturn(baz)({}))}\` }), {});"`
      );
    });

    test('with yielded component', () => {
      let template = stripIndent`
        <Foo as |NS|>
          <NS.Nested.Custom class="foo" />
        </Foo>
      `;

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "χ.invokeBlock(χ.resolve(χ.Globals[\\"Foo\\"])({}), {
          default(NS) {
            χ.applyAttributes<import(\\"@glint/template\\").ElementForComponent<typeof NS[\\"Nested\\"][\\"Custom\\"]>>({
              class: \\"foo\\",
            });
            χ.invokeBlock(χ.resolve(NS?.Nested?.Custom)({}), {});
          },
        });
        χ.Globals[\\"Foo\\"];"
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
