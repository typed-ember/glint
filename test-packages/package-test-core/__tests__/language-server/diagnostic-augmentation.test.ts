import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';

import {
  teardownSharedTestWorkspaceAfterEach,
  requestDiagnostics,
} from 'glint-monorepo-test-utils';

describe('Language Server: Diagnostic Augmentation', () => {
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test.skip('There is a content-tag parse error (for a class component)', async () => {
    let diagnostics = await requestDiagnostics(
      'index.gts',
      'glimmer-ts',
      stripIndent`
        import Component from '@glimmer/component';

        export interface AppSignature {
          Blocks: {
            expectsTwoParams: [a: string, b: number];
            expectsAtLeastOneParam: [a: string, ...rest: Array<string>];
          }
        }

        function expectsTwoArgs(a: string, b: number) {
          console.log(a, b);
        }

        export default class App extends Component<AppSignature> {
          <template>
            {{expectsTwoArgs "one"}}
        }
      `,
    );

    expect(diagnostics).toMatchInlineSnapshot();
  });

  test('expected argument count', async () => {
    let diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
      'glimmer-ts',
      stripIndent`
        import Component from '@glimmer/component';

        export interface AppSignature {
          Blocks: {
            expectsTwoParams: [a: string, b: number];
            expectsAtLeastOneParam: [a: string, ...rest: Array<string>];
          }
        }

        function expectsTwoArgs(a: string, b: number) {
          console.log(a, b);
        }

        function expectsAtLeastOneArg(a: string, ...rest: Array<string>) {
          console.log(a, ...rest);
        }

        export default class App extends Component<AppSignature> {
          <template>
            {{expectsTwoArgs "one"}}
            {{expectsTwoArgs "one" 2 "three"}}
            {{expectsTwoArgs "one" 2 named=true}}
            {{expectsAtLeastOneArg}}

            {{yield "one" to="expectsTwoParams"}}
            {{yield "one" 2 "three" to="expectsTwoParams"}}
            {{yield to="expectsAtLeastOneParam"}}
          </template>
        }
      `,
    );

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "code": 2554,
          "end": {
            "line": 21,
            "offset": 37,
          },
          "start": {
            "line": 21,
            "offset": 30,
          },
          "text": "Expected 2 arguments, but got 3.",
        },
        {
          "category": "error",
          "code": 2554,
          "end": {
            "line": 22,
            "offset": 40,
          },
          "start": {
            "line": 22,
            "offset": 30,
          },
          "text": "Expected 2 arguments, but got 3. Note that named args are passed together as a final argument, so they collectively increase the given arg count by 1.",
        },
        {
          "category": "error",
          "code": 2554,
          "end": {
            "line": 26,
            "offset": 28,
          },
          "start": {
            "line": 26,
            "offset": 21,
          },
          "text": "Expected 2 arguments, but got 3.",
        },
      ]
    `);
  });

  test('emit for attributes and top-level content', async () => {
    let diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
      'glimmer-ts',
      stripIndent`
        import Component from '@glimmer/component';

        export interface AppSignature {}

        const someRandomPOJO = {};
        const obj = { someRandomPOJO };

        export default class App extends Component<AppSignature> {
          <template>
            <div onclick={{someRandomPOJO}}></div>
            {{someRandomPOJO}}
            <div>{{someRandomPOJO}}</div>
            {{#let}}{{someRandomPOJO}}{{/let}}

            <div onclick={{obj.someRandomPOJO}}></div>
            {{obj.someRandomPOJO}}
            <div>{{obj.someRandomPOJO}}</div>
            {{#let}}{{obj.someRandomPOJO}}{{/let}}
          </template>
        }
      `,
    );

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "code": 2322,
          "end": {
            "line": 10,
            "offset": 17,
          },
          "relatedInformation": [
            {
              "category": "message",
              "code": 6500,
              "message": "The expected type comes from property 'onclick' which is declared here on type 'Partial<WithDataAttributes<HTMLDivElementAttributes>>'",
              "span": {
                "end": {
                  "line": 95,
                  "offset": 16,
                },
                "file": "\${testWorkspacePath}.pnpm/@glint+template@file+packages+template/node_modules/@glint/template/-private/dsl/elements.d.ts",
                "start": {
                  "line": 95,
                  "offset": 5,
                },
              },
            },
          ],
          "start": {
            "line": 10,
            "offset": 10,
          },
          "text": "Only primitive values (see \`AttrValue\` in \`@glint/template\`) are assignable as HTML attributes. If you want to set an event listener, consider using the \`{{on}}\` modifier instead.
      Type '{}' is not assignable to type 'AttrValue'.",
        },
        {
          "category": "error",
          "code": 2345,
          "end": {
            "line": 11,
            "offset": 23,
          },
          "start": {
            "line": 11,
            "offset": 5,
          },
          "text": "Only primitive values and certain DOM objects (see \`ContentValue\` in \`@glint/template\`) are usable as top-level template content.
      Argument of type '{}' is not assignable to parameter of type 'ContentValue'.",
        },
        {
          "category": "error",
          "code": 2345,
          "end": {
            "line": 12,
            "offset": 28,
          },
          "start": {
            "line": 12,
            "offset": 10,
          },
          "text": "Only primitive values and certain DOM objects (see \`ContentValue\` in \`@glint/template\`) are usable as top-level template content.
      Argument of type '{}' is not assignable to parameter of type 'ContentValue'.",
        },
        {
          "category": "error",
          "code": 2345,
          "end": {
            "line": 13,
            "offset": 31,
          },
          "start": {
            "line": 13,
            "offset": 13,
          },
          "text": "Argument of type '{}' is not assignable to parameter of type 'ContentValue'.",
        },
        {
          "category": "error",
          "code": 2322,
          "end": {
            "line": 15,
            "offset": 17,
          },
          "relatedInformation": [
            {
              "category": "message",
              "code": 6500,
              "message": "The expected type comes from property 'onclick' which is declared here on type 'Partial<WithDataAttributes<HTMLDivElementAttributes>>'",
              "span": {
                "end": {
                  "line": 95,
                  "offset": 16,
                },
                "file": "\${testWorkspacePath}.pnpm/@glint+template@file+packages+template/node_modules/@glint/template/-private/dsl/elements.d.ts",
                "start": {
                  "line": 95,
                  "offset": 5,
                },
              },
            },
          ],
          "start": {
            "line": 15,
            "offset": 10,
          },
          "text": "Only primitive values (see \`AttrValue\` in \`@glint/template\`) are assignable as HTML attributes. If you want to set an event listener, consider using the \`{{on}}\` modifier instead.
      Type '{}' is not assignable to type 'AttrValue'.",
        },
        {
          "category": "error",
          "code": 2345,
          "end": {
            "line": 16,
            "offset": 27,
          },
          "start": {
            "line": 16,
            "offset": 5,
          },
          "text": "Only primitive values and certain DOM objects (see \`ContentValue\` in \`@glint/template\`) are usable as top-level template content.
      Argument of type '{}' is not assignable to parameter of type 'ContentValue'.",
        },
        {
          "category": "error",
          "code": 2345,
          "end": {
            "line": 17,
            "offset": 32,
          },
          "start": {
            "line": 17,
            "offset": 10,
          },
          "text": "Only primitive values and certain DOM objects (see \`ContentValue\` in \`@glint/template\`) are usable as top-level template content.
      Argument of type '{}' is not assignable to parameter of type 'ContentValue'.",
        },
        {
          "category": "error",
          "code": 2345,
          "end": {
            "line": 18,
            "offset": 35,
          },
          "start": {
            "line": 18,
            "offset": 13,
          },
          "text": "Argument of type '{}' is not assignable to parameter of type 'ContentValue'.",
        },
      ]
    `);
  });

  test.skip('unresolved globals', async () => {
    let diagnostics = await requestDiagnostics(
      'index.hbs',
      'handlebars',
      stripIndent`
        {{! failed global lookups (custom message about the registry) }}
        <Foo />
        <foo.ok />
        {{foo.bar}}
        {{concat foo}}

        {{#let this.locals as |locals|}}
          {{! failed non-global lookup (no custom message) }}
          {{locals.bad-thing}}
        {{/let}}
      `,
    );

    expect(diagnostics).toMatchInlineSnapshot();
  });

  test.skip('failed `component` name lookup', async () => {
    let diagnostics = await requestDiagnostics(
      'index.hbs',
      'handlebars',
      stripIndent`
        {{#let 'baz' as |baz|}}
          {{#let
            (component 'foo') 
            (component this.componentName)
            (component baz)
            as |Foo Bar|
          }}
            {{! @glint-ignore: we don't care about errors here}}
            <Foo /><Bar /><Baz />
          {{/let}}
        {{/let}}
      `,
    );

    expect(diagnostics).toMatchInlineSnapshot();
  });

  test.skip('direct invocation of `{{component}}`', async () => {
    let diagnostics = await requestDiagnostics(
      'index.hbs',
      'handlebars',
      stripIndent`
        {{! inline invocation }}
        {{component 'my-component'}}
        {{component 'my-component' message="hi"}}

        {{! block invocation }}
        {{#component 'my-component'}}{{/component}}
        {{#component 'my-component' message="hi"}}{{/component}}
      `,
    );

    expect(diagnostics).toMatchInlineSnapshot();
  });

  test('bad `component`/`helper`/`modifier` arg type', async () => {
    let diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
      'glimmer-ts',
      stripIndent`
        import { ComponentLike, HelperLike, ModifierLike } from '@glint/template';

        declare const Comp: ComponentLike<{ Args: { foo: string } }>;
        declare const help: HelperLike<{ Args: { Named: { foo: string } } }>;
        declare const mod: ModifierLike<{ Args: { Named: { foo: string } } }>;

        <template>
          {{#let
            (component Comp foo=123)
            (helper help foo=123)
            (modifier mod foo=123)
          }}
          {{/let}}
        </template>
      `,
    );

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "code": 2345,
          "end": {
            "line": 9,
            "offset": 28,
          },
          "relatedInformation": [
            {
              "category": "error",
              "code": 2771,
              "message": "The last overload is declared here.",
              "span": {
                "end": {
                  "line": 94,
                  "offset": 5,
                },
                "file": "\${testWorkspacePath}.pnpm/@glint+template@file+packages+template/node_modules/@glint/template/-private/keywords/-bind-invokable.d.ts",
                "start": {
                  "line": 80,
                  "offset": 3,
                },
              },
            },
          ],
          "start": {
            "line": 9,
            "offset": 21,
          },
          "text": "Argument of type '[{ [NamedArgs]: true; foo: number; }]' is not assignable to parameter of type '[] | [NamedArgs<{ foo: string; }>]'.
        Type '[{ [NamedArgs]: true; foo: number; }]' is not assignable to type '[NamedArgs<{ foo: string; }>]'.
          Type '{ [NamedArgs]: true; foo: number; }' is not assignable to type 'NamedArgs<{ foo: string; }>'.
            Type '{ [NamedArgs]: true; foo: number; }' is not assignable to type '{ foo: string; }'.
              Types of property 'foo' are incompatible.
                Type 'number' is not assignable to type 'string'.",
        },
        {
          "category": "error",
          "code": 2345,
          "end": {
            "line": 10,
            "offset": 25,
          },
          "relatedInformation": [
            {
              "category": "error",
              "code": 2771,
              "message": "The last overload is declared here.",
              "span": {
                "end": {
                  "line": 94,
                  "offset": 5,
                },
                "file": "\${testWorkspacePath}.pnpm/@glint+template@file+packages+template/node_modules/@glint/template/-private/keywords/-bind-invokable.d.ts",
                "start": {
                  "line": 80,
                  "offset": 3,
                },
              },
            },
          ],
          "start": {
            "line": 10,
            "offset": 18,
          },
          "text": "Argument of type '[{ [NamedArgs]: true; foo: number; }]' is not assignable to parameter of type '[] | [NamedArgs<{ foo: string; }>]'.
        Type '[{ [NamedArgs]: true; foo: number; }]' is not assignable to type '[NamedArgs<{ foo: string; }>]'.
          Type '{ [NamedArgs]: true; foo: number; }' is not assignable to type 'NamedArgs<{ foo: string; }>'.
            Type '{ [NamedArgs]: true; foo: number; }' is not assignable to type '{ foo: string; }'.
              Types of property 'foo' are incompatible.
                Type 'number' is not assignable to type 'string'.",
        },
        {
          "category": "error",
          "code": 2345,
          "end": {
            "line": 11,
            "offset": 26,
          },
          "relatedInformation": [
            {
              "category": "error",
              "code": 2771,
              "message": "The last overload is declared here.",
              "span": {
                "end": {
                  "line": 94,
                  "offset": 5,
                },
                "file": "\${testWorkspacePath}.pnpm/@glint+template@file+packages+template/node_modules/@glint/template/-private/keywords/-bind-invokable.d.ts",
                "start": {
                  "line": 80,
                  "offset": 3,
                },
              },
            },
          ],
          "start": {
            "line": 11,
            "offset": 19,
          },
          "text": "Argument of type '[{ [NamedArgs]: true; foo: number; }]' is not assignable to parameter of type '[] | [NamedArgs<{ foo: string; }>]'.
        Type '[{ [NamedArgs]: true; foo: number; }]' is not assignable to type '[NamedArgs<{ foo: string; }>]'.
          Type '{ [NamedArgs]: true; foo: number; }' is not assignable to type 'NamedArgs<{ foo: string; }>'.
            Type '{ [NamedArgs]: true; foo: number; }' is not assignable to type '{ foo: string; }'.
              Types of property 'foo' are incompatible.
                Type 'number' is not assignable to type 'string'.",
        },
      ]
    `);
  });

  // Not sure why this isn't firing...
  test.skip('`noPropertyAccessFromIndexSignature` violation', async () => {
    let diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
      'glimmer-ts',
      stripIndent`
        declare const stringRecord: Record<string, string>;

        stringRecord.fooBar;

        <template>
          {{stringRecord.fooBar}}          
        </template>
      `,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });
});
