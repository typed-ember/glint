import { Project } from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';

describe('Language Server: Diagnostic Augmentation', () => {
  let project!: Project;

  beforeEach(async () => {
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('expected argument count', async () => {
    project.setGlintConfig({ environment: ['ember-loose', 'ember-template-imports'] });
    project.write({
      'index.gts': stripIndent`
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
    });

    let server = project.startLanguageServer();
    let diagnostics = server.getDiagnostics(project.fileURI('index.gts'));

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "code": 2554,
          "message": "Expected 2 arguments, but got 1.",
          "range": {
            "end": {
              "character": 28,
              "line": 19,
            },
            "start": {
              "character": 4,
              "line": 19,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2554,
          "message": "Expected 2 arguments, but got 3.",
          "range": {
            "end": {
              "character": 36,
              "line": 20,
            },
            "start": {
              "character": 29,
              "line": 20,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2554,
          "message": "Expected 2 arguments, but got 3. Note that named args are passed together as a final argument, so they collectively increase the given arg count by 1.",
          "range": {
            "end": {
              "character": 41,
              "line": 21,
            },
            "start": {
              "character": 4,
              "line": 21,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2555,
          "message": "Expected at least 1 arguments, but got 0.",
          "range": {
            "end": {
              "character": 28,
              "line": 22,
            },
            "start": {
              "character": 4,
              "line": 22,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2554,
          "message": "Expected 2 arguments, but got 1.",
          "range": {
            "end": {
              "character": 41,
              "line": 24,
            },
            "start": {
              "character": 4,
              "line": 24,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2554,
          "message": "Expected 2 arguments, but got 3.",
          "range": {
            "end": {
              "character": 27,
              "line": 25,
            },
            "start": {
              "character": 20,
              "line": 25,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2555,
          "message": "Expected at least 1 arguments, but got 0.",
          "range": {
            "end": {
              "character": 41,
              "line": 26,
            },
            "start": {
              "character": 4,
              "line": 26,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
      ]
    `);
  });

  test('emit for attributes and top-level content', () => {
    project.setGlintConfig({ environment: ['ember-loose', 'ember-template-imports'] });
    project.write({
      'index.gts': stripIndent`
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
    });

    let server = project.startLanguageServer();
    let diagnostics = server.getDiagnostics(project.fileURI('index.gts'));

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "code": 2322,
          "message": "Only primitive values (see \`AttrValue\` in \`@glint/template\`) are assignable as HTML attributes. If you want to set an event listener, consider using the \`{{on}}\` modifier instead.
        Type '{}' is not assignable to type 'AttrValue'.",
          "range": {
            "end": {
              "character": 35,
              "line": 9,
            },
            "start": {
              "character": 17,
              "line": 9,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2345,
          "message": "Only primitive values and certain DOM objects (see \`ContentValue\` in \`@glint/template\`) are usable as top-level template content.
        Argument of type '{}' is not assignable to parameter of type 'ContentValue'.",
          "range": {
            "end": {
              "character": 22,
              "line": 10,
            },
            "start": {
              "character": 4,
              "line": 10,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2345,
          "message": "Only primitive values and certain DOM objects (see \`ContentValue\` in \`@glint/template\`) are usable as top-level template content.
        Argument of type '{}' is not assignable to parameter of type 'ContentValue'.",
          "range": {
            "end": {
              "character": 27,
              "line": 11,
            },
            "start": {
              "character": 9,
              "line": 11,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2345,
          "message": "Only primitive values and certain DOM objects (see \`ContentValue\` in \`@glint/template\`) are usable as top-level template content.
        Argument of type '{}' is not assignable to parameter of type 'ContentValue'.",
          "range": {
            "end": {
              "character": 30,
              "line": 12,
            },
            "start": {
              "character": 12,
              "line": 12,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2322,
          "message": "Only primitive values (see \`AttrValue\` in \`@glint/template\`) are assignable as HTML attributes. If you want to set an event listener, consider using the \`{{on}}\` modifier instead.
        Type '{}' is not assignable to type 'AttrValue'.",
          "range": {
            "end": {
              "character": 39,
              "line": 14,
            },
            "start": {
              "character": 17,
              "line": 14,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2345,
          "message": "Only primitive values and certain DOM objects (see \`ContentValue\` in \`@glint/template\`) are usable as top-level template content.
        Argument of type '{}' is not assignable to parameter of type 'ContentValue'.",
          "range": {
            "end": {
              "character": 26,
              "line": 15,
            },
            "start": {
              "character": 4,
              "line": 15,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2345,
          "message": "Only primitive values and certain DOM objects (see \`ContentValue\` in \`@glint/template\`) are usable as top-level template content.
        Argument of type '{}' is not assignable to parameter of type 'ContentValue'.",
          "range": {
            "end": {
              "character": 31,
              "line": 16,
            },
            "start": {
              "character": 9,
              "line": 16,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2345,
          "message": "Only primitive values and certain DOM objects (see \`ContentValue\` in \`@glint/template\`) are usable as top-level template content.
        Argument of type '{}' is not assignable to parameter of type 'ContentValue'.",
          "range": {
            "end": {
              "character": 34,
              "line": 17,
            },
            "start": {
              "character": 12,
              "line": 17,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
      ]
    `);
  });

  test('unresolvable template entities', () => {
    project.setGlintConfig({ environment: ['ember-loose', 'ember-template-imports'] });
    project.write({
      'index.gts': stripIndent`
        import Component from '@glimmer/component';

        export interface AppSignature {}

        const SomeRandomPOJO = {};
        const obj = { SomeRandomPOJO };

        export default class App extends Component<AppSignature> {
          <template>
            <SomeRandomPOJO />
            {{SomeRandomPOJO "hi"}}
            {{#let (SomeRandomPOJO)}}{{/let}}
            <div {{SomeRandomPOJO}}></div>

            <obj.SomeRandomPOJO />
            {{obj.SomeRandomPOJO "hi"}}
            {{#let (obj.SomeRandomPOJO)}}{{/let}}
            <div {{obj.SomeRandomPOJO}}></div>
          </template>
        }
      `,
    });

    let server = project.startLanguageServer();
    let diagnostics = server.getDiagnostics(project.fileURI('index.gts'));

    // TS 5.0 nightlies generate a slightly different format of "here are all the overloads
    // and why they don't work" message, so for the time being we're truncating everything
    // after the first line of the error message. In the future when we reach a point where
    // we don't test against 4.x, we can go back to snapshotting the full message.
    diagnostics = diagnostics.map((diagnostic) => ({
      ...diagnostic,
      message: diagnostic.message.slice(0, diagnostic.message.indexOf('\n')),
    }));

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "code": 2769,
          "message": "The given value does not appear to be usable as a component, modifier or helper.",
          "range": {
            "end": {
              "character": 19,
              "line": 9,
            },
            "start": {
              "character": 5,
              "line": 9,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2769,
          "message": "The given value does not appear to be usable as a component, modifier or helper.",
          "range": {
            "end": {
              "character": 20,
              "line": 10,
            },
            "start": {
              "character": 6,
              "line": 10,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2769,
          "message": "The given value does not appear to be usable as a component, modifier or helper.",
          "range": {
            "end": {
              "character": 26,
              "line": 11,
            },
            "start": {
              "character": 12,
              "line": 11,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2769,
          "message": "The given value does not appear to be usable as a component, modifier or helper.",
          "range": {
            "end": {
              "character": 25,
              "line": 12,
            },
            "start": {
              "character": 11,
              "line": 12,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2769,
          "message": "The given value does not appear to be usable as a component, modifier or helper.",
          "range": {
            "end": {
              "character": 26,
              "line": 14,
            },
            "start": {
              "character": 4,
              "line": 14,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2769,
          "message": "The given value does not appear to be usable as a component, modifier or helper.",
          "range": {
            "end": {
              "character": 24,
              "line": 15,
            },
            "start": {
              "character": 6,
              "line": 15,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2769,
          "message": "The given value does not appear to be usable as a component, modifier or helper.",
          "range": {
            "end": {
              "character": 30,
              "line": 16,
            },
            "start": {
              "character": 12,
              "line": 16,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2769,
          "message": "The given value does not appear to be usable as a component, modifier or helper.",
          "range": {
            "end": {
              "character": 29,
              "line": 17,
            },
            "start": {
              "character": 11,
              "line": 17,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
      ]
    `);
  });

  test('unresolved globals', () => {
    project.setGlintConfig({ environment: ['ember-loose'] });
    project.write({
      'index.ts': stripIndent`
        import Component from '@glimmer/component';

        export default class MyComponent extends Component {
          declare locals: { message: string };
        }
      `,
      'index.hbs': stripIndent`
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
    });

    let server = project.startLanguageServer();
    let diagnostics = server.getDiagnostics(project.fileURI('index.hbs'));

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "code": 7053,
          "message": "Unknown name 'Foo'. If this isn't a typo, you may be missing a registry entry for this value; see the Template Registry page in the Glint documentation for more details.
        Element implicitly has an 'any' type because expression of type '\\"Foo\\"' can't be used to index type 'Globals'.
          Property 'Foo' does not exist on type 'Globals'.",
          "range": {
            "end": {
              "character": 7,
              "line": 1,
            },
            "start": {
              "character": 0,
              "line": 1,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 7053,
          "message": "Unknown name 'foo'. If this isn't a typo, you may be missing a registry entry for this value; see the Template Registry page in the Glint documentation for more details.
        Element implicitly has an 'any' type because expression of type '\\"foo\\"' can't be used to index type 'Globals'.
          Property 'foo' does not exist on type 'Globals'.",
          "range": {
            "end": {
              "character": 10,
              "line": 2,
            },
            "start": {
              "character": 0,
              "line": 2,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 7053,
          "message": "Unknown name 'foo'. If this isn't a typo, you may be missing a registry entry for this value; see the Template Registry page in the Glint documentation for more details.
        Element implicitly has an 'any' type because expression of type '\\"foo\\"' can't be used to index type 'Globals'.
          Property 'foo' does not exist on type 'Globals'.",
          "range": {
            "end": {
              "character": 9,
              "line": 3,
            },
            "start": {
              "character": 2,
              "line": 3,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 7053,
          "message": "Unknown name 'foo'. If this isn't a typo, you may be missing a registry entry for this value; see the Template Registry page in the Glint documentation for more details.
        Element implicitly has an 'any' type because expression of type '\\"foo\\"' can't be used to index type 'Globals'.
          Property 'foo' does not exist on type 'Globals'.",
          "range": {
            "end": {
              "character": 12,
              "line": 4,
            },
            "start": {
              "character": 9,
              "line": 4,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 7053,
          "message": "Element implicitly has an 'any' type because expression of type '\\"bad-thing\\"' can't be used to index type '{ message: string; }'.
        Property 'bad-thing' does not exist on type '{ message: string; }'.",
          "range": {
            "end": {
              "character": 20,
              "line": 8,
            },
            "start": {
              "character": 4,
              "line": 8,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
      ]
    `);
  });

  test('failed `component` name lookup', () => {
    project.setGlintConfig({ environment: ['ember-loose'] });
    project.write({
      'index.ts': stripIndent`
        import Component from '@glimmer/component';

        export default class MyComponent extends Component {
          componentName = 'bar' as const';
        }
      `,
      'index.hbs': stripIndent`
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
    });

    let server = project.startLanguageServer();
    let diagnostics = server.getDiagnostics(project.fileURI('index.hbs'));

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "code": 2769,
          "message": "Unknown component name 'foo'. If this isn't a typo, you may be missing a registry entry for this name; see the Template Registry page in the Glint documentation for more details.
        No overload matches this call.
          The last overload gave the following error.
            Argument of type '\\"foo\\"' is not assignable to parameter of type 'keyof Globals | null | undefined'.",
          "range": {
            "end": {
              "character": 20,
              "line": 2,
            },
            "start": {
              "character": 15,
              "line": 2,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2769,
          "message": "The type of this expression doesn't appear to be a valid value to pass the {{component}} helper. If possible, you may need to give the expression a narrower type, for example \`'thing-a' | 'thing-b'\` rather than \`string\`.
        No overload matches this call.
          The last overload gave the following error.
            Argument of type '\\"bar\\"' is not assignable to parameter of type 'keyof Globals | null | undefined'.",
          "range": {
            "end": {
              "character": 33,
              "line": 3,
            },
            "start": {
              "character": 15,
              "line": 3,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2769,
          "message": "The type of this expression doesn't appear to be a valid value to pass the {{component}} helper. If possible, you may need to give the expression a narrower type, for example \`'thing-a' | 'thing-b'\` rather than \`string\`.
        No overload matches this call.
          The last overload gave the following error.
            Argument of type 'string' is not assignable to parameter of type 'keyof Globals | null | undefined'.",
          "range": {
            "end": {
              "character": 18,
              "line": 4,
            },
            "start": {
              "character": 15,
              "line": 4,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
      ]
    `);
  });

  test('direct invocation of `{{component}}`', () => {
    project.setGlintConfig({ environment: ['ember-loose'] });
    project.write({
      'index.ts': stripIndent`
        import Component from '@glimmer/component';

        export interface MyComponentSignature {
          Args: {
            message?: string;
          };
          Blocks: {
            default: [];
          };
        }

        export default class MyComponent extends Component<MyComponentSignature> {}

        declare module '@glint/environment-ember-loose/registry' {
          export default interface Registry {
            'my-component': typeof MyComponent;
          }
        }
      `,
      'index.hbs': stripIndent`
        {{! inline invocation }}
        {{component 'my-component'}}
        {{component 'my-component' message="hi"}}

        {{! block invocation }}
        {{#component 'my-component'}}{{/component}}
        {{#component 'my-component' message="hi"}}{{/component}}
      `,
    });

    let server = project.startLanguageServer();
    let diagnostics = server.getDiagnostics(project.fileURI('index.hbs'));

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "code": 2345,
          "message": "The {{component}} helper can't be used to directly invoke a component under Glint. Consider first binding the result to a variable, e.g. '{{#let (component 'component-name') as |ComponentName|}}' and then invoking it as '<ComponentName @arg={{value}} />'.
        Argument of type 'Invokable<(named?: NamedArgs<{ message?: string | undefined; }> | undefined) => ComponentReturn<FlattenBlockParams<{ default: { Params: { Positional: []; }; }; }>, unknown>>' is not assignable to parameter of type 'ContentValue'.",
          "range": {
            "end": {
              "character": 28,
              "line": 1,
            },
            "start": {
              "character": 0,
              "line": 1,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2345,
          "message": "The {{component}} helper can't be used to directly invoke a component under Glint. Consider first binding the result to a variable, e.g. '{{#let (component 'component-name') as |ComponentName|}}' and then invoking it as '<ComponentName @arg={{value}} />'.
        Argument of type 'Invokable<(named?: PrebindArgs<{ message?: string | undefined; } & NamedArgsMarker, never> | undefined) => ComponentReturn<FlattenBlockParams<{ default: { Params: { Positional: []; }; }; }>, unknown>>' is not assignable to parameter of type 'ContentValue'.",
          "range": {
            "end": {
              "character": 41,
              "line": 2,
            },
            "start": {
              "character": 0,
              "line": 2,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 0,
          "message": "The {{component}} helper can't be used directly in block form under Glint. Consider first binding the result to a variable, e.g. '{{#let (component ...) as |...|}}' and then using the bound value.",
          "range": {
            "end": {
              "character": 12,
              "line": 5,
            },
            "start": {
              "character": 3,
              "line": 5,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 0,
          "message": "The {{component}} helper can't be used directly in block form under Glint. Consider first binding the result to a variable, e.g. '{{#let (component ...) as |...|}}' and then using the bound value.",
          "range": {
            "end": {
              "character": 12,
              "line": 6,
            },
            "start": {
              "character": 3,
              "line": 6,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
      ]
    `);
  });

  test('bad `component`/`helper`/`modifier` arg type', () => {
    project.setGlintConfig({ environment: ['ember-loose', 'ember-template-imports'] });
    project.write({
      'index.gts': stripIndent`
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
    });

    let server = project.startLanguageServer();
    let diagnostics = server.getDiagnostics(project.fileURI('index.gts'));

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "code": 2345,
          "message": "Unable to pre-bind the given args to the given component. This likely indicates a type mismatch between its signature and the values you're passing.
        Argument of type '[{ [NamedArgs]: true; foo: number; }]' is not assignable to parameter of type '[] | [NamedArgs<{ foo: string; }>]'.
          Type '[{ [NamedArgs]: true; foo: number; }]' is not assignable to type '[NamedArgs<{ foo: string; }>]'.
            Type '{ [NamedArgs]: true; foo: number; }' is not assignable to type 'NamedArgs<{ foo: string; }>'.
              Type '{ [NamedArgs]: true; foo: number; }' is not assignable to type '{ foo: string; }'.
                Types of property 'foo' are incompatible.
                  Type 'number' is not assignable to type 'string'.",
          "range": {
            "end": {
              "character": 28,
              "line": 8,
            },
            "start": {
              "character": 4,
              "line": 8,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2345,
          "message": "Unable to pre-bind the given args to the given helper. This likely indicates a type mismatch between its signature and the values you're passing.
        Argument of type '[{ [NamedArgs]: true; foo: number; }]' is not assignable to parameter of type '[] | [NamedArgs<{ foo: string; }>]'.
          Type '[{ [NamedArgs]: true; foo: number; }]' is not assignable to type '[NamedArgs<{ foo: string; }>]'.
            Type '{ [NamedArgs]: true; foo: number; }' is not assignable to type 'NamedArgs<{ foo: string; }>'.
              Type '{ [NamedArgs]: true; foo: number; }' is not assignable to type '{ foo: string; }'.
                Types of property 'foo' are incompatible.
                  Type 'number' is not assignable to type 'string'.",
          "range": {
            "end": {
              "character": 25,
              "line": 9,
            },
            "start": {
              "character": 4,
              "line": 9,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 2345,
          "message": "Unable to pre-bind the given args to the given modifier. This likely indicates a type mismatch between its signature and the values you're passing.
        Argument of type '[{ [NamedArgs]: true; foo: number; }]' is not assignable to parameter of type '[] | [NamedArgs<{ foo: string; }>]'.
          Type '[{ [NamedArgs]: true; foo: number; }]' is not assignable to type '[NamedArgs<{ foo: string; }>]'.
            Type '{ [NamedArgs]: true; foo: number; }' is not assignable to type 'NamedArgs<{ foo: string; }>'.
              Type '{ [NamedArgs]: true; foo: number; }' is not assignable to type '{ foo: string; }'.
                Types of property 'foo' are incompatible.
                  Type 'number' is not assignable to type 'string'.",
          "range": {
            "end": {
              "character": 26,
              "line": 10,
            },
            "start": {
              "character": 4,
              "line": 10,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
      ]
    `);
  });

  test('`noPropertyAccessFromIndexSignature` violation', () => {
    project.updateTsconfig((tsconfig) => {
      tsconfig.glint = { environment: ['ember-loose', 'ember-template-imports'] };
      tsconfig.compilerOptions ??= {};
      tsconfig.compilerOptions['noPropertyAccessFromIndexSignature'] = true;
    });

    project.write({
      'index.gts': stripIndent`
        declare const stringRecord: Record<string, string>;

        stringRecord.fooBar;

        <template>
          {{stringRecord.fooBar}}          
        </template>
      `,
    });

    let server = project.startLanguageServer();
    let diagnostics = server.getDiagnostics(project.fileURI('index.gts'));

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "code": 4111,
          "message": "Property 'fooBar' comes from an index signature, so it must be accessed with ['fooBar'].",
          "range": {
            "end": {
              "character": 19,
              "line": 2,
            },
            "start": {
              "character": 13,
              "line": 2,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
        {
          "code": 4111,
          "message": "Property 'fooBar' comes from an index signature, so it must be accessed with {{get ... 'fooBar'}}.",
          "range": {
            "end": {
              "character": 23,
              "line": 5,
            },
            "start": {
              "character": 17,
              "line": 5,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
      ]
    `);
  });
});
