import { stripIndent } from 'common-tags';
import { describe, test, expect } from 'vitest';
import {
  templateToTypescript,
  TemplateToTypescriptOptions,
} from '@glint/core/transform/template/template-to-typescript';

describe('Transform: rewriteTemplate', () => {
  // Slices out the template boilerplate to return only the code representing
  // the body, to keep snapshots brief and focused.
  function templateBody(
    template: string,
    options: Omit<TemplateToTypescriptOptions, 'typesModule'> = {},
  ): string {
    let { result, errors } = templateToTypescript(template, {
      typesModule: '@glint/template',
      ...options,
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
      expect(templateToTypescript('', { typesModule: '@glint/template' }).result?.code)
        .toMatchInlineSnapshot(`
          "({} as typeof import("@glint/template")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/template")) {
          __glintRef__; __glintDSL__;
          })"
        `);
    });

    test('given a backing value', () => {
      expect(
        templateToTypescript('', { backingValue: 'someValue', typesModule: '@glint/template' })
          .result?.code,
      ).toMatchInlineSnapshot(`
        "({} as typeof import("@glint/template")).templateForBackingValue(someValue, function(__glintRef__, __glintDSL__: typeof import("@glint/template")) {
        __glintRef__; __glintDSL__;
        })"
      `);
    });

    test('given preamble code', () => {
      let preamble = ['console.log("hello!");', 'throw new Error();'];

      expect(templateToTypescript('', { preamble, typesModule: '@glint/template' }).result?.code)
        .toMatchInlineSnapshot(`
          "({} as typeof import("@glint/template")).templateExpression(function(__glintRef__, __glintDSL__: typeof import("@glint/template")) {
          console.log("hello!");
          throw new Error();
          __glintRef__; __glintDSL__;
          })"
        `);
    });
  });

  describe('directives', () => {
    test('unknown directies are reported as errors', () => {
      let template = stripIndent`
        {{! @glint-check }}
        <Foo as |bar|>
          {{hello}}
        </Foo>
      `;

      let { result, errors } = templateToTypescript(template, { typesModule: '@glint/template' });

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

  describe('special forms', () => {
    describe('symbol consumption', () => {
      test('implicit globals are ignored in statement position', () => {
        let body = templateBody(`{{#t true}}{{/t}}`, {
          specialForms: { t: 'if' },
        });

        expect(body).toMatchInlineSnapshot(`
          "if (true) {
          }"
        `);
      });

      test('implicit globals are ignored in expression position', () => {
        let body = templateBody(`{{obj x=123}}`, {
          specialForms: { obj: 'object-literal' },
        });

        expect(body).toMatchInlineSnapshot(`
          "({
          x: 123,
          });"
        `);
      });

      test('explicit globals are ignored in statement position', () => {
        let body = templateBody(`{{#t true}}{{/t}}`, {
          specialForms: { t: 'if' },
          globals: ['t'],
        });

        expect(body).toMatchInlineSnapshot(`
          "if (true) {
          }"
        `);
      });

      test('explicit globals are ignored in expression position', () => {
        let body = templateBody(`{{obj x=123}}`, {
          specialForms: { obj: 'object-literal' },
          globals: ['obj'],
        });

        expect(body).toMatchInlineSnapshot(`
          "({
          x: 123,
          });"
        `);
      });

      test('outer-scope values are consumed statement position', () => {
        let body = templateBody(`{{#t true}}{{/t}}`, {
          specialForms: { t: 'if' },
          globals: [],
        });

        expect(body).toMatchInlineSnapshot(`
          "t;
          if (true) {
          }"
        `);
      });

      test('outer-scope values are consumed in expression position', () => {
        let body = templateBody(`{{obj x=123}}`, {
          specialForms: { obj: 'object-literal' },
          globals: [],
        });

        expect(body).toMatchInlineSnapshot(`
          "(__glintDSL__.noop(obj), ({
          x: 123,
          }));"
        `);
      });
    });

    describe('{{if}}', () => {
      test('without an alternate', () => {
        let template = '{{testIf @foo "ok"}}';
        let specialForms = { testIf: 'if' } as const;

        expect(templateBody(template, { specialForms })).toMatchInlineSnapshot(
          `"(__glintRef__.args.foo) ? ("ok") : (undefined);"`,
        );
      });

      test('with an alternate', () => {
        let template = '{{testIf @foo "ok" "nope"}}';
        let specialForms = { testIf: 'if' } as const;

        expect(templateBody(template, { specialForms })).toMatchInlineSnapshot(
          `"(__glintRef__.args.foo) ? ("ok") : ("nope");"`,
        );
      });
    });

    describe('{{unless}}', () => {
      test('without an alternate', () => {
        let template = '{{testUnless @foo "ok"}}';
        let specialForms = { testUnless: 'if-not' } as const;

        expect(templateBody(template, { specialForms })).toMatchInlineSnapshot(
          `"!(__glintRef__.args.foo) ? ("ok") : (undefined);"`,
        );
      });

      test('with an alternate', () => {
        let template = '{{testUnless @foo "ok" "nope"}}';
        let specialForms = { testUnless: 'if-not' } as const;

        expect(templateBody(template, { specialForms })).toMatchInlineSnapshot(
          `"!(__glintRef__.args.foo) ? ("ok") : ("nope");"`,
        );
      });
    });

    describe('{{#if}}', () => {
      test('without an {{else}}', () => {
        let template = stripIndent`
          {{#testIf @foo}}
            {{@ok}}
          {{/testIf}}
        `;

        let specialForms = { testIf: 'if' } as const;

        expect(templateBody(template, { specialForms })).toMatchInlineSnapshot(`
          "if (__glintRef__.args.foo) {
          __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.ok)());
          }"
        `);
      });

      test('with an {{else}}', () => {
        let template = stripIndent`
          {{#testIf @foo}}
            {{@ok}}
          {{else}}
            {{@noGood}}
          {{/testIf}}
        `;

        let specialForms = { testIf: 'if' } as const;

        expect(templateBody(template, { specialForms })).toMatchInlineSnapshot(`
          "if (__glintRef__.args.foo) {
          __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.ok)());
          } else {
          __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.noGood)());
          }"
        `);
      });

      test('with {{else if ...}}', () => {
        let template = stripIndent`
          {{#testIf @foo}}
            {{@ok}}
          {{else testIf @bar}}
            {{@noGood}}
          {{else}}
            {{@done}}
          {{/testIf}}
        `;

        let specialForms = { testIf: 'if' } as const;

        expect(templateBody(template, { specialForms })).toMatchInlineSnapshot(`
          "if (__glintRef__.args.foo) {
          __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.ok)());
          } else {
          if (__glintRef__.args.bar) {
          __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.noGood)());
          } else {
          __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.done)());
          }
          }"
        `);
      });

      test('with {{else someOtherIdentifier}}', () => {
        let template = stripIndent`
          {{#testIf @foo}}
            {{@ok}}
          {{else doAThing as |ok|}}
            {{ok}}
          {{else}}
            {{@nevermind}}
          {{/testIf}}
        `;

        let specialForms = { testIf: 'if' } as const;

        expect(templateBody(template, { specialForms })).toMatchInlineSnapshot(`
          "if (__glintRef__.args.foo) {
          __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.ok)());
          } else {
          {
          const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["doAThing"])());
          {
          const [ok] = __glintY__.blockParams["default"];
          __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(ok)());
          }
          {
          const [] = __glintY__.blockParams["else"];
          __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.nevermind)());
          }
          __glintDSL__.Globals["doAThing"];
          }
          }"
        `);
      });
    });

    describe('{{#unless}}', () => {
      test('without an {{else}}', () => {
        let template = stripIndent`
          {{#testUnless @foo}}
            {{@ok}}
          {{/testUnless}}
        `;

        let specialForms = { testUnless: 'if-not' } as const;

        expect(templateBody(template, { specialForms })).toMatchInlineSnapshot(`
          "if (!(__glintRef__.args.foo)) {
          __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.ok)());
          }"
        `);
      });

      test('with an {{else}}', () => {
        let template = stripIndent`
          {{#testUnless @foo}}
            {{@ok}}
          {{else}}
            {{@noGood}}
          {{/testUnless}}
        `;

        let specialForms = { testUnless: 'if-not' } as const;

        expect(templateBody(template, { specialForms })).toMatchInlineSnapshot(`
          "if (!(__glintRef__.args.foo)) {
          __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.ok)());
          } else {
          __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.noGood)());
          }"
        `);
      });
    });

    describe('{{yield}}', () => {
      test('default {{yield}}', () => {
        let template = stripIndent`
          {{testYield 123 this.message}}
        `;

        let specialForms = { testYield: 'yield' } as const;

        expect(templateBody(template, { specialForms })).toMatchInlineSnapshot(
          `"__glintDSL__.yieldToBlock(__glintRef__, "default")(123, __glintRef__.this.message);"`,
        );
      });

      test('{{yield}} to a named block', () => {
        let template = stripIndent`
          {{testYield 123 to="body"}}
        `;

        let specialForms = { testYield: 'yield' } as const;

        expect(templateBody(template, { specialForms })).toMatchInlineSnapshot(
          `"__glintDSL__.yieldToBlock(__glintRef__, "body")(123);"`,
        );
      });

      test('{{yield}} to else', () => {
        let template = stripIndent`
          {{testYield 123 to="else"}}
        `;

        let specialForms = { testYield: 'yield' } as const;

        expect(templateBody(template, { specialForms })).toMatchInlineSnapshot(
          `"__glintDSL__.yieldToBlock(__glintRef__, "else")(123);"`,
        );
      });

      test('{{yield}} to inverse', () => {
        let template = stripIndent`
          {{testYield 123 to="inverse"}}
        `;

        let specialForms = { testYield: 'yield' } as const;

        expect(templateBody(template, { specialForms })).toMatchInlineSnapshot(
          `"__glintDSL__.yieldToBlock(__glintRef__, "else")(123);"`,
        );
      });
    });

    describe('{{array}}', () => {
      test('without values', () => {
        let template = stripIndent`
          {{testArray}}
        `;

        let specialForms = { testArray: 'array-literal' } as const;

        expect(templateBody(template, { globals: [], specialForms })).toMatchInlineSnapshot(
          '"(__glintDSL__.noop(testArray), []);"',
        );
      });

      test('with values', () => {
        let template = stripIndent`
          {{testArray 1 true "free"}}
        `;

        let specialForms = { testArray: 'array-literal' } as const;

        expect(templateBody(template, { globals: [], specialForms })).toMatchInlineSnapshot(
          `"(__glintDSL__.noop(testArray), [1, true, "free"]);"`,
        );
      });

      test('within a subexpression', () => {
        let template = stripIndent`
          {{log (testArray 1 true "free")}}
        `;

        let specialForms = { testArray: 'array-literal' } as const;

        expect(templateBody(template, { globals: [], specialForms })).toMatchInlineSnapshot(
          `"__glintDSL__.emitContent(__glintDSL__.resolve(log)((__glintDSL__.noop(testArray), [1, true, "free"])));"`,
        );
      });
    });

    describe('{{hash}}', () => {
      test('without values', () => {
        let template = stripIndent`
          {{testHash}}
        `;

        let specialForms = { testHash: 'object-literal' } as const;

        expect(templateBody(template, { globals: [], specialForms })).toMatchInlineSnapshot(
          '"(__glintDSL__.noop(testHash), {});"',
        );
      });

      test('with values', () => {
        let template = stripIndent`
          {{testHash a=1 b="ok"}}
        `;

        let specialForms = { testHash: 'object-literal' } as const;

        expect(templateBody(template, { globals: [], specialForms })).toMatchInlineSnapshot(`
          "(__glintDSL__.noop(testHash), ({
          a: 1,
          b: "ok",
          }));"
        `);
      });

      test('within a subexpression', () => {
        let template = stripIndent`
          {{log (testHash a=1 b="ok")}}
        `;

        let specialForms = { testHash: 'object-literal' } as const;

        expect(templateBody(template, { globals: [], specialForms })).toMatchInlineSnapshot(`
          "__glintDSL__.emitContent(__glintDSL__.resolve(log)((__glintDSL__.noop(testHash), ({
          a: 1,
          b: "ok",
          }))));"
        `);
      });
    });

    describe('{{eq}}', () => {
      test('emits ===', () => {
        let template = stripIndent`
          {{log (testEq 1 2)}}
        `;

        expect(templateBody(template, { globals: ['testEq'], specialForms: { testEq: '===' } }))
          .toMatchInlineSnapshot(`
          "__glintDSL__.emitContent(__glintDSL__.resolve(log)((1 === 2)));"
        `);
      });
    });

    describe('{{neq}}', () => {
      test('emits !==', () => {
        let template = stripIndent`
          {{log (testNeq 1 2)}}
        `;

        expect(templateBody(template, { globals: ['testNeq'], specialForms: { testNeq: '!==' } }))
          .toMatchInlineSnapshot(`
          "__glintDSL__.emitContent(__glintDSL__.resolve(log)((1 !== 2)));"
        `);
      });
    });

    describe('{{and}}', () => {
      test('with two arguments', () => {
        let template = stripIndent`
        {{log (testAnd 1 2)}}
        `;

        expect(templateBody(template, { globals: ['testAnd'], specialForms: { testAnd: '&&' } }))
          .toMatchInlineSnapshot(`
        "__glintDSL__.emitContent(__glintDSL__.resolve(log)((1 && 2)));"
        `);
      });

      test('with three arguments', () => {
        let template = stripIndent`
        {{log (testAnd 1 2 3)}}
        `;

        expect(templateBody(template, { globals: ['testAnd'], specialForms: { testAnd: '&&' } }))
          .toMatchInlineSnapshot(`
        "__glintDSL__.emitContent(__glintDSL__.resolve(log)((1 && 2 && 3)));"
        `);
      });
    });

    describe('{{or}}', () => {
      test('with two arguments', () => {
        let template = stripIndent`
        {{log (testOr 1 2)}}
        `;

        expect(templateBody(template, { globals: ['testOr'], specialForms: { testOr: '||' } }))
          .toMatchInlineSnapshot(`
        "__glintDSL__.emitContent(__glintDSL__.resolve(log)((1 || 2)));"
        `);
      });

      test('with three arguments', () => {
        let template = stripIndent`
        {{log (testOr 1 2 3)}}
        `;

        expect(templateBody(template, { globals: ['testOr'], specialForms: { testOr: '||' } }))
          .toMatchInlineSnapshot(`
        "__glintDSL__.emitContent(__glintDSL__.resolve(log)((1 || 2 || 3)));"
        `);
      });
    });

    describe('{{not}}', () => {
      test('with one argument', () => {
        let template = stripIndent`
        {{log (testNot 1)}}
        `;

        expect(templateBody(template, { globals: ['testNot'], specialForms: { testNot: '!' } }))
          .toMatchInlineSnapshot(`
        "__glintDSL__.emitContent(__glintDSL__.resolve(log)(!1));"
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
            `"__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintDSL__.Globals["message"])());"`,
          );
        });

        test('in-scope identifier', () => {
          let template = '{{message}}';

          expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(
            '"__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(message)());"',
          );
        });

        test('chained path', () => {
          let template = '{{obj.foo.bar}}';

          expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(
            '"__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(obj?.foo?.bar)());"',
          );
        });

        test('chained path with a spinal-case key', () => {
          let template = '{{obj.foo-bar.baz}}';

          expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(
            `"__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(obj?.["foo-bar"]?.baz)());"`,
          );
        });

        test('`this` path', () => {
          let template = '{{this}}';

          expect(templateBody(template)).toMatchInlineSnapshot(
            '"__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this)());"',
          );
        });

        test('chained `this` path', () => {
          let template = '{{this.foo.bar}}';

          expect(templateBody(template)).toMatchInlineSnapshot(
            '"__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.foo?.bar)());"',
          );
        });

        test('chained `this` path with a spinal-case key', () => {
          let template = '{{this.foo-bar}}';

          expect(templateBody(template)).toMatchInlineSnapshot(
            `"__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this["foo-bar"])());"`,
          );
        });

        test('`@arg` path', () => {
          let template = '{{@foo}}';

          expect(templateBody(template)).toMatchInlineSnapshot(
            '"__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.foo)());"',
          );
        });

        test('`@arg` path with a spinal-case name', () => {
          let template = '{{@foo-bar}}';

          expect(templateBody(template)).toMatchInlineSnapshot(
            `"__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args["foo-bar"])());"`,
          );
        });

        test('passed as an attr', () => {
          let template = '<Foo data-bar={{helper param=true}} />';

          expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
            "{
            const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(Foo)());
            __glintDSL__.applyAttributes(__glintY__.element, {
            "data-bar": __glintDSL__.resolve(helper)({ param: true , ...__glintDSL__.NamedArgsMarker }),
            });
            }"
          `);
        });

        test('passed as an @arg', () => {
          let template = '<Foo @bar={{helper param=true}} />';

          expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
            "{
            const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(Foo)({ 
            bar: __glintDSL__.resolve(helper)({ param: true , ...__glintDSL__.NamedArgsMarker }), ...__glintDSL__.NamedArgsMarker }));
            __glintY__;
            }"
          `);
        });
      });

      describe('path locations', () => {
        test('top-level', () => {
          let template = '{{@input}}';

          expect(templateBody(template)).toMatchInlineSnapshot(
            '"__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.input)());"',
          );
        });

        test('passed to an attribute', () => {
          let template = '<div data-attr={{@input}}></div>';

          expect(templateBody(template)).toMatchInlineSnapshot(`
            "{
            const __glintY__ = __glintDSL__.emitElement("div");
            __glintDSL__.applyAttributes(__glintY__.element, {
            "data-attr": __glintDSL__.resolveOrReturn(__glintRef__.args.input)(),
            });
            }"
          `);
        });

        test('in a concat statement', () => {
          let template = '<div data-attr="hello, {{@input}}"></div>';

          expect(templateBody(template)).toMatchInlineSnapshot(`
            "{
            const __glintY__ = __glintDSL__.emitElement("div");
            __glintDSL__.applyAttributes(__glintY__.element, {
            "data-attr": \`\${__glintDSL__.resolveOrReturn(__glintRef__.args.input)()}\`,
            });
            }"
          `);
        });

        describe('passed to an @arg', () => {
          test('an @arg', () => {
            let template = '<Greet @message={{@arg}} />';

            expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
              "{
              const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(Greet)({ 
              message: __glintRef__.args.arg, ...__glintDSL__.NamedArgsMarker }));
              __glintY__;
              }"
            `);
          });

          test('a global identifier', () => {
            let template = '<Greet @message={{foo}} />';

            expect(templateBody(template, { globals: ['foo'] })).toMatchInlineSnapshot(`
              "{
              const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(Greet)({ 
              message: __glintDSL__.resolveOrReturn(__glintDSL__.Globals["foo"])(), ...__glintDSL__.NamedArgsMarker }));
              __glintY__;
              }"
            `);
          });

          test('an in-scope identifier', () => {
            let template = '<Greet @message={{foo}} />';

            expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
              "{
              const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(Greet)({ 
              message: foo, ...__glintDSL__.NamedArgsMarker }));
              __glintY__;
              }"
            `);
          });

          test('a shadowed global identifier', () => {
            let template = '{{#let foo as |bar|}}<Greet @message={{bar}} />{{/let}}';

            expect(templateBody(template, { globals: ['let', 'foo'] })).toMatchInlineSnapshot(`
              "{
              const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["let"])(__glintDSL__.Globals["foo"]));
              {
              const [bar] = __glintY__.blockParams["default"];
              {
              const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(Greet)({ 
              message: bar, ...__glintDSL__.NamedArgsMarker }));
              __glintY__;
              }
              }
              __glintDSL__.Globals["let"];
              }"
            `);
          });
        });

        test('as a subexpression', () => {
          let template = '{{(@foo)}}';

          expect(templateBody(template)).toMatchInlineSnapshot(
            '"__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintDSL__.resolve(__glintRef__.args.foo)())());"',
          );
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
        expect(templateBody('{{"hello"}}')).toMatchInlineSnapshot(`""hello";"`);
      });
    });

    describe('helper and inline-curly component invocations', () => {
      test('positional params', () => {
        let template = '{{doSomething "hello" 123}}';

        expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(
          `"__glintDSL__.emitContent(__glintDSL__.resolve(doSomething)("hello", 123));"`,
        );
      });

      test('named params', () => {
        let template = '{{doSomething a=123 b="ok"}}';

        expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(
          `"__glintDSL__.emitContent(__glintDSL__.resolve(doSomething)({ a: 123, b: "ok" , ...__glintDSL__.NamedArgsMarker }));"`,
        );
      });

      test('named and positional params', () => {
        let template = '{{doSomething "one" true 3 four=4}}';

        expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(
          `"__glintDSL__.emitContent(__glintDSL__.resolve(doSomething)("one", true, 3, { four: 4 , ...__glintDSL__.NamedArgsMarker }));"`,
        );
      });
    });
  });

  describe('modifiers', () => {
    test('on a plain element', () => {
      let template = `<div {{modifier foo="bar"}}></div>`;

      expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
        "{
        const __glintY__ = __glintDSL__.emitElement("div");
        __glintDSL__.applyAttributes(__glintY__.element, {
         
        });
        __glintDSL__.applyModifier(__glintDSL__.resolve(modifier)(__glintY__.element, { foo: "bar" , ...__glintDSL__.NamedArgsMarker }));
        }"
      `);
    });

    test('on a component', () => {
      let template = `<MyComponent {{modifier foo="bar"}}/>`;

      expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
        "{
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(MyComponent)());
        __glintDSL__.applyAttributes(__glintY__.element, {
         
        });
        __glintDSL__.applyModifier(__glintDSL__.resolve(modifier)(__glintY__.element, { foo: "bar" , ...__glintDSL__.NamedArgsMarker }));
        }"
      `);
    });
  });

  describe('subexpressions', () => {
    test('resolution', () => {
      let template = `<div data-attr={{concat (foo 1) (foo true)}}></div>`;

      expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
        "{
        const __glintY__ = __glintDSL__.emitElement("div");
        __glintDSL__.applyAttributes(__glintY__.element, {
        "data-attr": __glintDSL__.resolve(concat)(__glintDSL__.resolve(foo)(1), __glintDSL__.resolve(foo)(true)),
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
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["foo"])());
        {
        const [bar, baz] = __glintY__.blockParams["default"];
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(bar)());
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(baz)());
        }
        __glintDSL__.Globals["foo"];
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
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["foo"])());
        {
        const [bar, baz] = __glintY__.blockParams["default"];
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(bar)());
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(baz)());
        }
        {
        const [] = __glintY__.blockParams["else"];
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.oh)());
        }
        __glintDSL__.Globals["foo"];
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
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["foo"])());
        {
        const [bar, baz] = __glintY__.blockParams["default"];
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(bar)());
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(baz)());
        }
        {
        const [] = __glintY__.blockParams["else"];
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.oh)());
        }
        __glintDSL__.Globals["foo"];
        }"
      `);
    });
  });

  describe('plain elements', () => {
    test('with programmatic contents', () => {
      let template = '<div>{{@foo}}</div>';

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
        const __glintY__ = __glintDSL__.emitElement("div");
        __glintY__;
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.foo)());
        }"
      `);
    });

    test('with mustache attrs', () => {
      let template = '<div data-foo={{@foo}}></div>';

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
        const __glintY__ = __glintDSL__.emitElement("div");
        __glintDSL__.applyAttributes(__glintY__.element, {
        "data-foo": __glintDSL__.resolveOrReturn(__glintRef__.args.foo)(),
        });
        }"
      `);
    });

    test('with interpolated attrs', () => {
      let template = '<div data-foo="value-{{@foo}}-{{@bar}}"></div>';

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
        const __glintY__ = __glintDSL__.emitElement("div");
        __glintDSL__.applyAttributes(__glintY__.element, {
        "data-foo": \`\${__glintDSL__.resolveOrReturn(__glintRef__.args.foo)()}\${__glintDSL__.resolveOrReturn(__glintRef__.args.bar)()}\`,
        });
        }"
      `);
    });

    test('with splattributes', () => {
      let template = '<div ...attributes></div>';

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
        const __glintY__ = __glintDSL__.emitElement("div");
        __glintDSL__.applySplattributes(__glintRef__.element, __glintY__.element);
        __glintDSL__.applyAttributes(__glintY__.element, {
         
        });
        }"
      `);
    });
  });

  describe('angle bracket components', () => {
    test('self-closing', () => {
      let template = `<Foo @bar="hello" />`;

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["Foo"])({ 
        bar: "hello", ...__glintDSL__.NamedArgsMarker }));
        __glintY__;
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
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["Foo"])());
        __glintY__;
        {
        const [bar] = __glintY__.blockParams["default"];
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(bar)());
        }
        }"
      `);
    });

    test('with splattributes', () => {
      let template = '<Foo ...attributes />';

      expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
        "{
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(Foo)());
        __glintDSL__.applySplattributes(__glintRef__.element, __glintY__.element);
        __glintDSL__.applyAttributes(__glintY__.element, {
         
        });
        }"
      `);
    });

    test('with an in-scope variable for a name', () => {
      let template = '{{#let "div" as |div|}}<div></div>{{/let}}';

      expect(templateBody(template, { globals: ['let'] })).toMatchInlineSnapshot(`
        "{
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["let"])("div"));
        {
        const [div] = __glintY__.blockParams["default"];
        {
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(div)());
        __glintY__;
        {
        const [] = __glintY__.blockParams["default"];
        }
        }
        }
        __glintDSL__.Globals["let"];
        }"
      `);
    });

    test('with a path for a name', () => {
      let template = '<foo.bar @arg="hello" />';

      expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
        "{
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(foo?.bar)({ 
        arg: "hello", ...__glintDSL__.NamedArgsMarker }));
        __glintY__;
        }"
      `);
    });

    test('with an @arg for a name', () => {
      let template = '<@foo @arg="hello" />';

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintRef__.args.foo)({ 
        arg: "hello", ...__glintDSL__.NamedArgsMarker }));
        __glintY__;
        }"
      `);
    });

    test('with a `this` path for a name', () => {
      let template = '<this.foo @arg="hello" />';

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintRef__.this.foo)({ 
        arg: "hello", ...__glintDSL__.NamedArgsMarker }));
        __glintY__;
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
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["Foo"])());
        __glintY__;
        {
        const [h] = __glintY__.blockParams["head"];
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());
        }
        {
        const [b] = __glintY__.blockParams["body"];
        {
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(b?.contents)());
        __glintY__;
        {
        const [] = __glintY__.blockParams["default"];
        }
        }
        }
        }"
      `);
    });

    test('with concat args', () => {
      let template = `<Foo @arg="bar-{{baz}}" />`;

      expect(templateBody(template, { globals: [] })).toMatchInlineSnapshot(`
        "{
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(Foo)({ 
        arg: \`\${__glintDSL__.resolveOrReturn(baz)()}\`, ...__glintDSL__.NamedArgsMarker }));
        __glintY__;
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
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["Foo"])());
        __glintY__;
        {
        const [NS] = __glintY__.blockParams["default"];
        {
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(NS?.Nested?.Custom)());
        __glintDSL__.applyAttributes(__glintY__.element, {
        class: "foo",
        });
        }
        }
        }"
      `);
    });

    test('with a reserved block param identifier', () => {
      let template = stripIndent`
        <Foo as |switch|>
          {{switch}}
        </Foo>
      `;

      expect(templateBody(template)).toMatchInlineSnapshot(`
        "{
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals["Foo"])());
        __glintY__;
        {
        const [__switch] = __glintY__.blockParams["default"];
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__switch)());
        }
        }"
      `);
    });
  });

  describe('error conditions', () => {
    test('Handlebars syntax error', () => {
      let { errors } = templateToTypescript('<Foo @attr={{"123}} />', {
        typesModule: '@glint/template',
      });

      expect(errors).toEqual([
        {
          location: { start: 11, end: 13 },
          message: stripIndent`
            Parse error on line 1:
            <Foo @attr={{\"123}} />
            -------------^
            Expecting 'OPEN_SEXPR', 'ID', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'
          `,
        },
      ]);
    });

    test('HTML syntax error', () => {
      let { errors } = templateToTypescript('<Foo </Foo>', {
        typesModule: '@glint/template',
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
      let { errors } = templateToTypescript('<Foo @attr={{testYield}} />', {
        typesModule: '@glint/template',
        specialForms: { testYield: 'yield' },
      });

      expect(errors).toEqual([
        {
          message: '{{testYield}} may only appear as a top-level statement',
          location: { start: 11, end: 24 },
        },
      ]);
    });

    test('{{yield}} to a dynamic named block', () => {
      let { errors } = templateToTypescript('{{testYield to=@blockName}}', {
        typesModule: '@glint/template',
        specialForms: { testYield: 'yield' },
      });

      expect(errors).toEqual([
        {
          message: 'Named block {{testYield}}s must have a literal block name',
          location: { start: 0, end: 27 },
        },
      ]);
    });

    test('{{hash}} with positional parameters', () => {
      let { errors } = templateToTypescript('<Foo @attr={{testHash 123 foo="bar"}} />', {
        typesModule: '@glint/template',
        specialForms: { testHash: 'object-literal' },
      });

      expect(errors).toEqual([
        {
          message: '{{testHash}} only accepts named parameters',
          location: { start: 11, end: 37 },
        },
      ]);
    });

    test('{{array}} with named parameters', () => {
      let { errors } = templateToTypescript('<Foo @attr={{testArray 123 foo="bar"}} />', {
        typesModule: '@glint/template',
        specialForms: { testArray: 'array-literal' },
      });

      expect(errors).toEqual([
        {
          message: '{{testArray}} only accepts positional parameters',
          location: { start: 11, end: 38 },
        },
      ]);
    });

    test('{{eq}} with named parameters', () => {
      let { errors } = templateToTypescript('<Foo @attr={{testEq 123 foo="bar"}} />', {
        typesModule: '@glint/template',
        specialForms: { testEq: '===' },
      });

      expect(errors).toEqual([
        {
          message: '{{testEq}} only accepts positional parameters',
          location: { start: 11, end: 35 },
        },
      ]);
    });

    test('{{eq}} with wrong number of parameters', () => {
      let { errors } = templateToTypescript('<Foo @attr={{testEq 123 456 789}} />', {
        typesModule: '@glint/template',
        specialForms: { testEq: '===' },
      });

      expect(errors).toEqual([
        {
          message: '{{testEq}} requires exactly two parameters',
          location: { start: 11, end: 33 },
        },
      ]);
    });

    test('{{neq}} with named parameters', () => {
      let { errors } = templateToTypescript('<Foo @attr={{testNeq 123 foo="bar"}} />', {
        typesModule: '@glint/template',
        specialForms: { testNeq: '!==' },
      });

      expect(errors).toEqual([
        {
          message: '{{testNeq}} only accepts positional parameters',
          location: { start: 11, end: 36 },
        },
      ]);
    });

    test('{{neq}} with wrong number of parameters', () => {
      let { errors } = templateToTypescript('<Foo @attr={{testNeq 123 456 789}} />', {
        typesModule: '@glint/template',
        specialForms: { testNeq: '!==' },
      });

      expect(errors).toEqual([
        {
          message: '{{testNeq}} requires exactly two parameters',
          location: { start: 11, end: 34 },
        },
      ]);
    });

    test('{{and}} with named parameters', () => {
      let { errors } = templateToTypescript('<Foo @attr={{testAnd 123 456 foo="bar"}} />', {
        typesModule: '@glint/template',
        specialForms: { testAnd: '&&' },
      });

      expect(errors).toEqual([
        {
          message: '{{testAnd}} only accepts positional parameters',
          location: { start: 11, end: 40 },
        },
      ]);
    });

    test('{{and}} with wrong number of parameters', () => {
      let { errors } = templateToTypescript('<Foo @attr={{testAnd 123}} />', {
        typesModule: '@glint/template',
        specialForms: { testAnd: '&&' },
      });

      expect(errors).toEqual([
        {
          message: '{{testAnd}} requires at least two parameters',
          location: { start: 11, end: 26 },
        },
      ]);
    });

    test('{{or}} with named parameters', () => {
      let { errors } = templateToTypescript('<Foo @attr={{testOr 123 456 foo="bar"}} />', {
        typesModule: '@glint/template',
        specialForms: { testOr: '||' },
      });

      expect(errors).toEqual([
        {
          message: '{{testOr}} only accepts positional parameters',
          location: { start: 11, end: 39 },
        },
      ]);
    });

    test('{{or}} with wrong number of parameters', () => {
      let { errors } = templateToTypescript('<Foo @attr={{testOr 123}} />', {
        typesModule: '@glint/template',
        specialForms: { testOr: '||' },
      });

      expect(errors).toEqual([
        {
          message: '{{testOr}} requires at least two parameters',
          location: { start: 11, end: 25 },
        },
      ]);
    });

    test('{{not}} with named parameters', () => {
      let { errors } = templateToTypescript('<Foo @attr={{testNot 123 foo="bar"}} />', {
        typesModule: '@glint/template',
        specialForms: { testNot: '!' },
      });

      expect(errors).toEqual([
        {
          message: '{{testNot}} only accepts positional parameters',
          location: { start: 11, end: 36 },
        },
      ]);
    });

    test('{{not}} with wrong number of parameters', () => {
      let { errors } = templateToTypescript('<Foo @attr={{testNot 123 456}} />', {
        typesModule: '@glint/template',
        specialForms: { testNot: '!' },
      });

      expect(errors).toEqual([
        {
          message: '{{testNot}} requires exactly one parameter',
          location: { start: 11, end: 30 },
        },
      ]);
    });

    test('inline {{if}} with no consequent', () => {
      let { errors } = templateToTypescript('<Foo @attr={{testIf true}} />', {
        typesModule: '@glint/template',
        specialForms: { testIf: 'if' },
      });

      expect(errors).toEqual([
        {
          message: '{{testIf}} requires at least two parameters',
          location: { start: 11, end: 26 },
        },
      ]);
    });

    test('block {{#if}} with no condition', () => {
      let { errors } = templateToTypescript(
        stripIndent`
          {{#testIf}}
            hello!
          {{/testIf}}
        `,
        { typesModule: '@glint/template', specialForms: { testIf: 'if' } },
      );

      expect(errors).toEqual([
        {
          message: '{{#testIf}} requires exactly one condition',
          location: { start: 0, end: 32 },
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
        { typesModule: '@glint/template' },
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
        { typesModule: '@glint/template' },
      );

      expect(errors).toEqual([
        {
          message: 'Block params must be valid TypeScript identifiers',
          location: { start: 0, end: 51 },
        },
      ]);
    });
  });

  describe('global variables', () => {
    test('uses vaariable in scope over global variable', () => {
      let template = `
        {{action "action"}}
        {{#each actions as |action|}}
          {{action}}
        {{/each}}`;

      expect(templateBody(template, { globals: ['action'] })).toMatchInlineSnapshot(`
        "__glintDSL__.emitContent(__glintDSL__.resolve(__glintDSL__.Globals["action"])("action"));
        {
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(each)(actions));
        {
        const [action] = __glintY__.blockParams["default"];
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(action)());
        }
        each;
        }"
      `);
    });
  });
});
