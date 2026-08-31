import { GlintEnvironment } from '@glint/ember-tsc/config/index';
import { rewriteModule } from '@glint/ember-tsc/transform/index';
import { stripIndent } from 'common-tags';
import ts from 'typescript';
import { describe, expect, test } from 'vitest';

describe('Transform: rewriteModule', () => {
  describe('inline tagged template', () => {
    const env = GlintEnvironment.load({});

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

      let transformedModule = rewriteModule(ts, { script }, env);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent extends Component {
          static { ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {
        __glintRef__; __glintDSL__;
        }) }
        }"
      `);
    });

    // A `<template>` in a class field initializer is an expression template
    // (the authoring format compiles it to a template-only component), so it
    // must emit `templateExpression` — NOT `templateForBackingValue(this)`,
    // which breaks context inference in field position and silently types the
    // template's `{{this}}` as `any`. (#1182) Its `{{this.*}}` paths reference
    // the lexical `this` of the field position (the enclosing instance)
    // directly rather than going through the template context.
    test('with a class field template', () => {
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class MyComponent extends Component {
            private readonly index = 10;

            private readonly X = <template>{{this.index}}</template>;

            <template><this.X /></template>
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, env);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent extends Component {
          private readonly index = 10;

          private readonly X = ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression((__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) => {
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(this.index)());
        __glintRef__; __glintDSL__;
        });

          static { ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {
        {
        const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintRef__.this.X)());
        }
        __glintRef__; __glintDSL__;
        }) }
        }"
      `);
    });

    // An expression template at module scope has no meaningful lexical `this`,
    // so `{{this.*}}` stays on the template context (`__glintRef__.this`).
    // That's what lets consumers assign a context type to the template through
    // contextual typing — `typeTest(context, <template>...)` from
    // `@glint/type-test` types `{{this}}` as the given context. Emitting the
    // module's lexical `this` (type `undefined`) instead broke that. (#1186)
    // A field initializer with no trailing semicolon is followed directly by
    // the class's template. The preprocessed `[___T`...`]` member must not be
    // read as an element access on that initializer (`value[___T`...`]`),
    // which emitted the class's own template as a context-bound expression.
    test('with a class member template after a field without a semicolon', () => {
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class MyComponent extends Component {
            isChecked = (value: unknown) => this.args.value === value

            <template>{{this.isChecked 1}}</template>
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, env);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent extends Component {
          isChecked = (value: unknown) => this.args.value === value

          static { ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {
        __glintDSL__.emitContent(__glintDSL__.resolve(__glintRef__.this.isChecked)(1));
        __glintRef__; __glintDSL__;
        }) }
        }"
      `);
    });

    test('with a module-scope expression template referencing {{this}}', () => {
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          const ModuleScoped = <template>{{this.message}}</template>;
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, env);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "const ModuleScoped = ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression((__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) => {
        __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.message)());
        __glintRef__; __glintDSL__;
        });"
      `);
    });

    test('handles the $ character', () => {
      let script = {
        filename: 'test.gts',
        contents: '<template>${{dollarAmount}}</template>;',
      };

      let transformedModule = rewriteModule(ts, { script }, env);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "export default ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression((__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) => {
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

      let transformedModule = rewriteModule(ts, { script }, env);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "export default ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression((__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) => {
        __glintRef__; __glintDSL__;
        });"
      `);
    });

    test('source-map offsets are stable after a ` character earlier in the template', () => {
      // Regression test: the .gts preprocessor escapes backticks inside
      // template content so the wrapped chunk parses as a valid JS template
      // literal. Previously the transform used `node.template.rawText`, which
      // preserves those backslash-escapes verbatim and inflated the template
      // length by 1 per escape — shifting every downstream source-map offset
      // by the same amount. The visible symptom was cmd-hover / go-to-def
      // underlines landing past the start of identifiers (most noticeable
      // for hyphenated keywords like `in-element`) when a backtick appeared
      // earlier in the same template (e.g. inside a `{{! ... }}` comment).
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class MyComponent extends Component<{ Args: { dest: Element } }> {
            <template>
              {{! Renders into \`dest\`. }}
              {{#in-element @dest}}hello{{/in-element}}
            </template>
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, env);

      expect(transformedModule?.errors).toEqual([]);

      // The transform emits `in_element` (identifier-safe) for the hyphenated
      // `in-element` keyword. Map that identifier back to the original .gts
      // and confirm it lands exactly on `in-element` rather than +N chars past.
      let transformed = transformedModule!.transformedContents;
      let transformedStart = transformed.indexOf('Globals.in_element');
      expect(transformedStart).toBeGreaterThan(-1);
      let identifierStart = transformedStart + 'Globals.'.length;
      let identifierEnd = identifierStart + 'in_element'.length;

      let originalRange = transformedModule!.getOriginalRange(identifierStart, identifierEnd);
      let originalStart = script.contents.indexOf('in-element');

      expect(originalRange.start).toBe(originalStart);
      expect(
        script.contents.slice(originalRange.start, originalRange.start + 'in-element'.length),
      ).toBe('in-element');
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

      let transformedModule = rewriteModule(ts, { script }, env);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent<K extends string> extends Component<{ value: K }> {
          static { ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {
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

      let transformedModule = rewriteModule(ts, { script }, env);

      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class extends Component {
          static { ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {
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

      let transformedModule = rewriteModule(ts, { script }, env);

      expect(transformedModule?.errors.length).toBe(1);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent extends Component {
          static { ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {
        __glintRef__; __glintDSL__;
        }) }
        }"
      `);
    });

    test('with a content-tag parse error, keeps raw source but disables verification', () => {
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          import Component from '@glimmer/component';
          export default class MyComponent extends Component {
            <template>
              <div></div>
            </template
          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, env);

      // Exactly one error — the content-tag parse failure — is reported on the
      // transformed module. The Volar `g-compiler-errors` language service
      // plugin reads from this array to surface the error as a diagnostic.
      expect(transformedModule?.errors.length).toBe(1);
      expect(transformedModule?.errors[0]?.isContentTagError).toBe(true);

      // The transformed source is the raw .gts source: content-tag parse
      // errors happen constantly mid-keystroke (e.g. right after typing
      // `foo.`), and TypeScript's error-tolerant parser can still provide
      // completions/hover/navigation for the script portions of the raw
      // source. The flood of misleading TS errors against the still-unparsed
      // `<template>` tags is suppressed via the mappings instead: every
      // mapping has `verification: false`, so Volar drops all TS diagnostics
      // for the file (in both tsserver and CLI modes) while other language
      // features keep working.
      expect(transformedModule?.transformedContents).toBe(script.contents);

      const mappings = transformedModule!.toVolarMappings();
      expect(mappings.length).toBeGreaterThan(0);
      for (const mapping of mappings) {
        expect(mapping.data.verification).toBe(false);
        expect(mapping.data.completion).toBe(true);
      }
    });
  });

  describe('with loaded environment', () => {
    test('in class extends', () => {
      let customEnv = GlintEnvironment.load({});
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          import Component from 'special/component';
          export default class MyComponent extends Component(<template></template>) {

          }
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, customEnv);

      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from 'special/component';
        export default class MyComponent extends Component(({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression((__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) => {
        __glintRef__; __glintDSL__;
        })) {

        }"
      `);
    });

    test('embedded gts templates', () => {
      let customEnv = GlintEnvironment.load({});
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

      expect(rewritten?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: TemplateEmbedding
        |  hbs(22:74):   <template>\\n    Hello, {{this.target}}!\\n  </template>
        |  ts(22:319):   static { ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.target)());\\n__glintRef__; __glintDSL__;\\n}) }
        |
        | | Mapping: Template
        | |  hbs(32:63):   Hello, {{this.target}}!
        | |  ts(52:83):    "@glint/ember-tsc/-private/dsl"
        | |
        | | Mapping: Template
        | |  hbs(32:63):   Hello, {{this.target}}!
        | |  ts(203:287):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.target)());
        | |
        | | | Mapping: TextContent
        | | |  hbs(37:43):   Hello,
        | | |  ts(203:203):
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(44:59):   {{this.target}}
        | | |  ts(203:285):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.target)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(44:59):   {{this.target}}
        | | | |  ts(228:284):  __glintDSL__.resolveOrReturn(__glintRef__.this.target)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(46:57):   this.target
        | | | | |  ts(228:282):  __glintDSL__.resolveOrReturn(__glintRef__.this.target)
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(46:57):   this.target
        | | | | | |  ts(257:281):  __glintRef__.this.target
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(46:50):   this
        | | | | | | |  ts(270:274):  this
        | | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(51:57):   target
        | | | | | | |  ts(275:281):  target
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  hbs(59:60):   !
        | | |  ts(287:287):
        | | |
        | |
        |"
      `);
    });

    test('implicit default export', () => {
      let customEnv = GlintEnvironment.load({});
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
        |  ts(0:285):    export default ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression((__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) => {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.target)());\\n__glintRef__; __glintDSL__;\\n})
        |
        | | Mapping: Template
        | |  hbs(10:33):   Hello, {{@target}}!
        | |  ts(36:67):    "@glint/ember-tsc/-private/dsl"
        | |
        | | Mapping: Template
        | |  hbs(10:33):   Hello, {{@target}}!
        | |  ts(171:255):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.target)());
        | |
        | | | Mapping: TextContent
        | | |  hbs(13:19):   Hello,
        | | |  ts(171:171):
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(20:31):   {{@target}}
        | | |  ts(171:253):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.target)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(20:31):   {{@target}}
        | | | |  ts(196:252):  __glintDSL__.resolveOrReturn(__glintRef__.args.target)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(22:29):   @target
        | | | | |  ts(196:250):  __glintDSL__.resolveOrReturn(__glintRef__.args.target)
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(22:29):   @target
        | | | | | |  ts(225:249):  __glintRef__.args.target
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(23:29):   target
        | | | | | | |  ts(243:249):  target
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  hbs(31:32):   !
        | | |  ts(255:255):
        | | |
        | |
        |"
      `);
    });

    test('mixed expression and class uses', () => {
      let customEnv = GlintEnvironment.load({});
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

      expect(rewritten?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: TemplateEmbedding
        |  hbs(56:89):   <template>{{@message}}</template>
        |  ts(56:327):   ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression((__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) => {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.message)());\\n__glintRef__; __glintDSL__;\\n})
        |
        | | Mapping: Template
        | |  hbs(66:78):   {{@message}}
        | |  ts(77:108):   "@glint/ember-tsc/-private/dsl"
        | |
        | | Mapping: Template
        | |  hbs(66:78):   {{@message}}
        | |  ts(212:297):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.message)());
        | |
        | | | Mapping: MustacheStatement
        | | |  hbs(66:78):   {{@message}}
        | | |  ts(212:295):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.message)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(66:78):   {{@message}}
        | | | |  ts(237:294):  __glintDSL__.resolveOrReturn(__glintRef__.args.message)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(68:76):   @message
        | | | | |  ts(237:292):  __glintDSL__.resolveOrReturn(__glintRef__.args.message)
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(68:76):   @message
        | | | | | |  ts(266:291):  __glintRef__.args.message
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(69:76):   message
        | | | | | | |  ts(284:291):  message
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | |
        | |
        |

        | Mapping: TemplateEmbedding
        |  hbs(139:174): <template>{{this.title}}</template>
        |  ts(377:673):  static { ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateForBackingValue(this, function(__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) {\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.title)());\\n__glintRef__; __glintDSL__;\\n}) }
        |
        | | Mapping: Template
        | |  hbs(149:163): {{this.title}}
        | |  ts(407:438):  "@glint/ember-tsc/-private/dsl"
        | |
        | | Mapping: Template
        | |  hbs(149:163): {{this.title}}
        | |  ts(558:641):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.title)());
        | |
        | | | Mapping: MustacheStatement
        | | |  hbs(149:163): {{this.title}}
        | | |  ts(558:639):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.this.title)())
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(149:163): {{this.title}}
        | | | |  ts(583:638):  __glintDSL__.resolveOrReturn(__glintRef__.this.title)()
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(151:161): this.title
        | | | | |  ts(583:636):  __glintDSL__.resolveOrReturn(__glintRef__.this.title)
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(151:161): this.title
        | | | | | |  ts(612:635):  __glintRef__.this.title
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(151:155): this
        | | | | | | |  ts(625:629):  this
        | | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(156:161): title
        | | | | | | |  ts(630:635):  title
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | |
        | |
        |"
      `);
    });

    test('block params of a block containing nested block params', () => {
      // The `as |params|` list is located by searching backward from the
      // block body's start. Searching from its *end* finds the nested block's
      // params instead, mis-anchoring (or, when the name never appears later,
      // invalidating) the outer params' mappings.
      let env = GlintEnvironment.load({});
      let script = {
        filename: 'foo.gts',
        contents: stripIndent`
          <template>
            {{#let "hello" as |greeting|}}
              {{#each @items as |item|}}
                {{greeting}} {{item}}
              {{/each}}
            {{/let}}
          </template>
        `,
      };

      expect(rewriteModule(ts, { script }, env)?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: TemplateEmbedding
        |  hbs(0:139):   <template>\\n  {{#let "hello" as |greeting|}}\\n    {{#each @items as |item|}}\\n      {{greeting}} {{item}}\\n    {{/each}}\\n  {{/let}}\\n</template>
        |  ts(0:731):    export default ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression((__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) => {\\n{\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals.let)("hello"));\\n{\\nconst [greeting] = __glintY__.blockParams["default"];\\n{\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals.each)(__glintRef__.args.items));\\n{\\nconst [item] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(greeting)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(item)());\\n}\\n__glintDSL__.Globals.each;\\n}\\n}\\n__glintDSL__.Globals.let;\\n}\\n__glintRef__; __glintDSL__;\\n})
        |
        | | Mapping: Template
        | |  hbs(10:128):  {{#let "hello" as |greeting|}}\\n    {{#each @items as |item|}}\\n      {{greeting}} {{item}}\\n    {{/each}}\\n  {{/let}}
        | |  ts(36:67):    "@glint/ember-tsc/-private/dsl"
        | |
        | | Mapping: Template
        | |  hbs(10:128):  {{#let "hello" as |greeting|}}\\n    {{#each @items as |item|}}\\n      {{greeting}} {{item}}\\n    {{/each}}\\n  {{/let}}
        | |  ts(171:701):  {\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals.let)("hello"));\\n{\\nconst [greeting] = __glintY__.blockParams["default"];\\n{\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals.each)(__glintRef__.args.items));\\n{\\nconst [item] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(greeting)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(item)());\\n}\\n__glintDSL__.Globals.each;\\n}\\n}\\n__glintDSL__.Globals.let;\\n}
        | |
        | | | Mapping: TextContent
        | | |  hbs(10:11):
        | | |  ts(171:171):
        | | |
        | | | Mapping: BlockStatement
        | | |  hbs(13:127):  {{#let "hello" as |greeting|}}\\n    {{#each @items as |item|}}\\n      {{greeting}} {{item}}\\n    {{/each}}\\n  {{/let}}
        | | |  ts(171:700):  {\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals.let)("hello"));\\n{\\nconst [greeting] = __glintY__.blockParams["default"];\\n{\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals.each)(__glintRef__.args.items));\\n{\\nconst [item] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(greeting)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(item)());\\n}\\n__glintDSL__.Globals.each;\\n}\\n}\\n__glintDSL__.Globals.let;\\n}
        | | |
        | | | | Mapping: BlockStatement
        | | | |  hbs(13:127):  {{#let "hello" as |greeting|}}\\n    {{#each @items as |item|}}\\n      {{greeting}} {{item}}\\n    {{/each}}\\n  {{/let}}
        | | | |  ts(219:274):  __glintDSL__.resolve(__glintDSL__.Globals.let)("hello")
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(16:19):   let
        | | | | |  ts(219:265):  __glintDSL__.resolve(__glintDSL__.Globals.let)
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(16:19):   let
        | | | | | |  ts(240:264):  __glintDSL__.Globals.let
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(16:19):   let
        | | | | | | |  ts(261:264):  let
        | | | | | | |
        | | | | | |
        | | | | |
        | | | | | Mapping: StringLiteral
        | | | | |  hbs(20:27):   "hello"
        | | | | |  ts(266:273):  "hello"
        | | | | |
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(32:40):   greeting
        | | | |  ts(286:294):  greeting
        | | | |
        | | | | Mapping: BlockStatement
        | | | |  hbs(48:116):  {{#each @items as |item|}}\\n      {{greeting}} {{item}}\\n    {{/each}}
        | | | |  ts(333:670):  {\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals.each)(__glintRef__.args.items));\\n{\\nconst [item] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(greeting)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(item)());\\n}\\n__glintDSL__.Globals.each;\\n}
        | | | |
        | | | | | Mapping: BlockStatement
        | | | | |  hbs(48:116):  {{#each @items as |item|}}\\n      {{greeting}} {{item}}\\n    {{/each}}
        | | | | |  ts(381:453):  __glintDSL__.resolve(__glintDSL__.Globals.each)(__glintRef__.args.items)
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(51:55):   each
        | | | | | |  ts(381:428):  __glintDSL__.resolve(__glintDSL__.Globals.each)
        | | | | | |
        | | | | | | | Mapping: PathExpression
        | | | | | | |  hbs(51:55):   each
        | | | | | | |  ts(402:427):  __glintDSL__.Globals.each
        | | | | | | |
        | | | | | | | | Mapping: Identifier
        | | | | | | | |  hbs(51:55):   each
        | | | | | | | |  ts(423:427):  each
        | | | | | | | |
        | | | | | | |
        | | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(56:62):   @items
        | | | | | |  ts(429:452):  __glintRef__.args.items
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(57:62):   items
        | | | | | | |  ts(447:452):  items
        | | | | | | |
        | | | | | |
        | | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(67:71):   item
        | | | | |  ts(465:469):  item
        | | | | |
        | | | | | Mapping: TextContent
        | | | | |  hbs(75:81):
        | | | | |  ts(508:508):
        | | | | |
        | | | | | Mapping: MustacheStatement
        | | | | |  hbs(81:93):   {{greeting}}
        | | | | |  ts(508:574):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(greeting)())
        | | | | |
        | | | | | | Mapping: MustacheStatement
        | | | | | |  hbs(81:93):   {{greeting}}
        | | | | | |  ts(533:573):  __glintDSL__.resolveOrReturn(greeting)()
        | | | | | |
        | | | | | | | Mapping: PathExpression
        | | | | | | |  hbs(83:91):   greeting
        | | | | | | |  ts(533:571):  __glintDSL__.resolveOrReturn(greeting)
        | | | | | | |
        | | | | | | | | Mapping: PathExpression
        | | | | | | | |  hbs(83:91):   greeting
        | | | | | | | |  ts(562:570):  greeting
        | | | | | | | |
        | | | | | | | | | Mapping: Identifier
        | | | | | | | | |  hbs(83:91):   greeting
        | | | | | | | | |  ts(562:570):  greeting
        | | | | | | | | |
        | | | | | | | |
        | | | | | | |
        | | | | | |
        | | | | |
        | | | | | Mapping: TextContent
        | | | | |  hbs(93:94):
        | | | | |  ts(576:576):
        | | | | |
        | | | | | Mapping: MustacheStatement
        | | | | |  hbs(94:102):  {{item}}
        | | | | |  ts(576:638):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(item)())
        | | | | |
        | | | | | | Mapping: MustacheStatement
        | | | | | |  hbs(94:102):  {{item}}
        | | | | | |  ts(601:637):  __glintDSL__.resolveOrReturn(item)()
        | | | | | |
        | | | | | | | Mapping: PathExpression
        | | | | | | |  hbs(96:100):  item
        | | | | | | |  ts(601:635):  __glintDSL__.resolveOrReturn(item)
        | | | | | | |
        | | | | | | | | Mapping: PathExpression
        | | | | | | | |  hbs(96:100):  item
        | | | | | | | |  ts(630:634):  item
        | | | | | | | |
        | | | | | | | | | Mapping: Identifier
        | | | | | | | | |  hbs(96:100):  item
        | | | | | | | | |  ts(630:634):  item
        | | | | | | | | |
        | | | | | | | |
        | | | | | | |
        | | | | | |
        | | | | |
        | | | | | Mapping: TextContent
        | | | | |  hbs(102:103):
        | | | | |  ts(640:640):
        | | | | |
        | | | | | Mapping: Identifier
        | | | | |  hbs(110:114): each
        | | | | |  ts(663:667):  each
        | | | | |
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(122:125): let
        | | | |  ts(694:697):  let
        | | | |
        | | |
        | |
        |"
      `);
    });

    test('backslash escapes in template string literals', () => {
      // The .gts preprocessor wraps template content in a JS template literal
      // and the transform reads the cooked text back out, so user backslashes
      // must be doubled on the way in or `\'` cooks to `'` and the template
      // fails to parse.
      let env = GlintEnvironment.load({});
      let script = {
        filename: 'foo.gts',
        contents: stripIndent`
          const fm = (s: string): string => s;

          <template>
            {{fm 'you\\'ve arrived'}}
            {{fm "say \\"hi\\" now"}}
          </template>
        `,
      };

      expect(rewriteModule(ts, { script }, env)?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: TemplateEmbedding
        |  hbs(38:113):  <template>\\n  {{fm 'you\\'ve arrived'}}\\n  {{fm "say \\"hi\\" now"}}\\n</template>
        |  ts(38:379):   export default ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression((__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) => {\\n__glintDSL__.emitContent(__glintDSL__.resolve(fm)("you've arrived"));\\n__glintDSL__.emitContent(__glintDSL__.resolve(fm)("say \\"hi\\" now"));\\n__glintRef__; __glintDSL__;\\n})
        |
        | | Mapping: Template
        | |  hbs(48:102):  {{fm 'you\\'ve arrived'}}\\n  {{fm "say \\"hi\\" now"}}
        | |  ts(74:105):   "@glint/ember-tsc/-private/dsl"
        | |
        | | Mapping: Template
        | |  hbs(48:102):  {{fm 'you\\'ve arrived'}}\\n  {{fm "say \\"hi\\" now"}}
        | |  ts(209:349):  __glintDSL__.emitContent(__glintDSL__.resolve(fm)("you've arrived"));\\n__glintDSL__.emitContent(__glintDSL__.resolve(fm)("say \\"hi\\" now"));
        | |
        | | | Mapping: TextContent
        | | |  hbs(48:51):
        | | |  ts(209:209):
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(51:75):   {{fm 'you\\'ve arrived'}}
        | | |  ts(209:277):  __glintDSL__.emitContent(__glintDSL__.resolve(fm)("you've arrived"))
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(51:75):   {{fm 'you\\'ve arrived'}}
        | | | |  ts(234:276):  __glintDSL__.resolve(fm)("you've arrived")
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(53:55):   fm
        | | | | |  ts(234:258):  __glintDSL__.resolve(fm)
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(53:55):   fm
        | | | | | |  ts(255:257):  fm
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(53:55):   fm
        | | | | | | |  ts(255:257):  fm
        | | | | | | |
        | | | | | |
        | | | | |
        | | | | | Mapping: StringLiteral
        | | | | |  hbs(56:73):   'you\\'ve arrived'
        | | | | |  ts(259:275):  "you've arrived"
        | | | | |
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  hbs(75:78):
        | | |  ts(279:279):
        | | |
        | | | Mapping: MustacheStatement
        | | |  hbs(78:101):  {{fm "say \\"hi\\" now"}}
        | | |  ts(279:347):  __glintDSL__.emitContent(__glintDSL__.resolve(fm)("say \\"hi\\" now"))
        | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(78:101):  {{fm "say \\"hi\\" now"}}
        | | | |  ts(304:346):  __glintDSL__.resolve(fm)("say \\"hi\\" now")
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(80:82):   fm
        | | | | |  ts(304:328):  __glintDSL__.resolve(fm)
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(80:82):   fm
        | | | | | |  ts(325:327):  fm
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(80:82):   fm
        | | | | | | |  ts(325:327):  fm
        | | | | | | |
        | | | | | |
        | | | | |
        | | | | | Mapping: StringLiteral
        | | | | |  hbs(83:99):   "say \\"hi\\" now"
        | | | | |  ts(329:345):  "say \\"hi\\" now"
        | | | | |
        | | | |
        | | |
        | | | Mapping: TextContent
        | | |  hbs(101:102):
        | | |  ts(349:349):
        | | |
        | |
        |"
      `);
    });

    test('with imported special forms', () => {
      let env = GlintEnvironment.load({});
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
        |  ts(58:642):   export default ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression((__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) => {\\n{\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals.let)((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n}))));\\n{\\nconst [arr, h] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());\\n}\\n__glintDSL__.Globals.let;\\n}\\n__glintRef__; __glintDSL__;\\n})
        |
        | | Mapping: Template
        | |  hbs(68:199):  {{! Intentionally shadowing }}\\n  {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | |  ts(94:125):   "@glint/ember-tsc/-private/dsl"
        | |
        | | Mapping: Template
        | |  hbs(68:199):  {{! Intentionally shadowing }}\\n  {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | |  ts(229:612):  {\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals.let)((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n}))));\\n{\\nconst [arr, h] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());\\n}\\n__glintDSL__.Globals.let;\\n}
        | |
        | | | Mapping: TextContent
        | | |  hbs(68:69):
        | | |  ts(229:229):
        | | |
        | | | Mapping: MustacheCommentStatement
        | | |  hbs(71:101):  {{! Intentionally shadowing }}
        | | |  ts(229:229):
        | | |
        | | | Mapping: BlockStatement
        | | |  hbs(104:198): {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | | |  ts(229:611):  {\\nconst __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(__glintDSL__.Globals.let)((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n}))));\\n{\\nconst [arr, h] = __glintY__.blockParams["default"];\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)());\\n__glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)());\\n}\\n__glintDSL__.Globals.let;\\n}
        | | |
        | | | | Mapping: BlockStatement
        | | | |  hbs(104:198): {{#let (arr 1 2) (h red="blue") as |arr h|}}\\n    Array is {{arr}}\\n    Hash is {{h}}\\n  {{/let}}
        | | | |  ts(277:401):  __glintDSL__.resolve(__glintDSL__.Globals.let)((__glintDSL__.noop(arr), [1, 2]), (__glintDSL__.noop(h), ({\\nred: "blue",\\n})))
        | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(107:110): let
        | | | | |  ts(277:323):  __glintDSL__.resolve(__glintDSL__.Globals.let)
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(107:110): let
        | | | | | |  ts(298:322):  __glintDSL__.Globals.let
        | | | | | |
        | | | | | | | Mapping: Identifier
        | | | | | | |  hbs(107:110): let
        | | | | | | |  ts(319:322):  let
        | | | | | | |
        | | | | | |
        | | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(112:115): arr
        | | | | |  ts(343:346):  arr
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(112:115): arr
        | | | | | |  ts(343:346):  arr
        | | | | | |
        | | | | |
        | | | | | Mapping: SubExpression
        | | | | |  hbs(111:120): (arr 1 2)
        | | | | |  ts(349:355):  [1, 2]
        | | | | |
        | | | | | | Mapping: NumberLiteral
        | | | | | |  hbs(116:117): 1
        | | | | | |  ts(350:351):  1
        | | | | | |
        | | | | | | Mapping: NumberLiteral
        | | | | | |  hbs(118:119): 2
        | | | | | |  ts(353:354):  2
        | | | | | |
        | | | | |
        | | | | | Mapping: PathExpression
        | | | | |  hbs(122:123): h
        | | | | |  ts(377:378):  h
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(122:123): h
        | | | | | |  ts(377:378):  h
        | | | | | |
        | | | | |
        | | | | | Mapping: SubExpression
        | | | | |  hbs(121:135): (h red="blue")
        | | | | |  ts(381:399):  ({\\nred: "blue",\\n})
        | | | | |
        | | | | | | Mapping: Identifier
        | | | | | |  hbs(124:127): red
        | | | | | |  ts(384:387):  red
        | | | | | |
        | | | | | | Mapping: StringLiteral
        | | | | | |  hbs(128:134): "blue"
        | | | | | |  ts(389:395):  "blue"
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(140:143): arr
        | | | |  ts(413:416):  arr
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(144:145): h
        | | | |  ts(418:419):  h
        | | | |
        | | | | Mapping: TextContent
        | | | |  hbs(153:161): Array is
        | | | |  ts(458:458):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(162:169): {{arr}}
        | | | |  ts(458:519):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(arr)())
        | | | |
        | | | | | Mapping: MustacheStatement
        | | | | |  hbs(162:169): {{arr}}
        | | | | |  ts(483:518):  __glintDSL__.resolveOrReturn(arr)()
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(164:167): arr
        | | | | | |  ts(483:516):  __glintDSL__.resolveOrReturn(arr)
        | | | | | |
        | | | | | | | Mapping: PathExpression
        | | | | | | |  hbs(164:167): arr
        | | | | | | |  ts(512:515):  arr
        | | | | | | |
        | | | | | | | | Mapping: Identifier
        | | | | | | | |  hbs(164:167): arr
        | | | | | | | |  ts(512:515):  arr
        | | | | | | | |
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  hbs(174:181): Hash is
        | | | |  ts(521:521):
        | | | |
        | | | | Mapping: MustacheStatement
        | | | |  hbs(182:187): {{h}}
        | | | |  ts(521:580):  __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(h)())
        | | | |
        | | | | | Mapping: MustacheStatement
        | | | | |  hbs(182:187): {{h}}
        | | | | |  ts(546:579):  __glintDSL__.resolveOrReturn(h)()
        | | | | |
        | | | | | | Mapping: PathExpression
        | | | | | |  hbs(184:185): h
        | | | | | |  ts(546:577):  __glintDSL__.resolveOrReturn(h)
        | | | | | |
        | | | | | | | Mapping: PathExpression
        | | | | | | |  hbs(184:185): h
        | | | | | | |  ts(575:576):  h
        | | | | | | |
        | | | | | | | | Mapping: Identifier
        | | | | | | | |  hbs(184:185): h
        | | | | | | | |  ts(575:576):  h
        | | | | | | | |
        | | | | | | |
        | | | | | |
        | | | | |
        | | | |
        | | | | Mapping: TextContent
        | | | |  hbs(187:188):
        | | | |  ts(582:582):
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(193:196): let
        | | | |  ts(605:608):  let
        | | | |
        | | |
        | |
        |"
      `);
    });

    describe('satisfies', () => {
      test('with implicit export default', () => {
        let customEnv = GlintEnvironment.load({});
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
          "import type { TOC } from '@ember/component/template-only';
          export default ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression((__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) => {
          __glintRef__; __glintDSL__;
          }) satisfies TOC<{
            Blocks: { default: [] }
          }>;"
        `);
      });

      test('with two template-only components', () => {
        const env = GlintEnvironment.load({});

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

        let transformedModule = rewriteModule(ts, { script }, env);

        expect(transformedModule?.errors?.length).toBe(0);
        expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
          "import type { TOC } from '@ember/component/template-only';

          const SmolComp = 
            ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression((__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) => {
          __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(__glintRef__.args.name)());
          __glintRef__; __glintDSL__;
          }) satisfies TOC<{ Args: { name: string }}>;

          export default ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression((__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) => {
          {
          const __glintY__ = __glintDSL__.emitComponent(__glintDSL__.resolve(SmolComp)({ 
          name: "Ember", ...__glintDSL__.NamedArgsMarker }));
          }
          __glintRef__; __glintDSL__;
          }) satisfies TOC<{ Args: {}, Blocks: {}, Element: null }>
          "
        `);
      });
    });

    describe('unicode and other special characters', () => {
      // Issue #756: Files with unicode in a non-last component should not break Glint
      // (Verified fixed in V2 - multibyte unicode characters are handled correctly)
      describe('emoji / multibyte unicode', () => {
        test('GitHub Issue#756 - emoji in non-last template does not break parsing', () => {
          const env = GlintEnvironment.load({});

          let script = {
            filename: 'test.gts',
            contents: [
              `import type { TOC } from '@ember/component/template-only';`,
              ``,
              `const EmojiComp: TOC<{}> =`,
              `  <template>`,
              `    🎉 hello`,
              `  </template>;`,
              ``,
              `const AfterEmoji: TOC<{ Args: { name: string } }> =`,
              `  <template>`,
              `    <EmojiComp /> {{@name}}`,
              `  </template>;`,
            ].join('\n'),
          };

          let transformedModule = rewriteModule(ts, { script }, env);

          expect.soft(transformedModule?.errors?.length).toBe(0);
          expect.soft(transformedModule?.errors).toMatchInlineSnapshot(`[]`);
        });
      });

      describe('$', () => {
        test('GitHub Issue#840 - does not error', () => {
          const env = GlintEnvironment.load({});

          let script = {
            filename: 'test.gts',
            contents: [
              // https://github.com/typed-ember/glint/issues/879
              '<template>',
              '  ${{foo}}',
              '</template>',
            ].join('\n'),
          };

          let transformedModule = rewriteModule(ts, { script }, env);

          expect.soft(transformedModule?.errors?.length).toBe(0);
          expect.soft(transformedModule?.errors).toMatchInlineSnapshot(`[]`);
          expect.soft(transformedModule?.transformedContents).toMatchInlineSnapshot(`
            "export default ({} as typeof import("@glint/ember-tsc/-private/dsl")).templateExpression((__glintRef__, __glintDSL__: typeof import("@glint/ember-tsc/-private/dsl")) => {
            __glintDSL__.emitContent(__glintDSL__.resolveOrReturn(foo)());
            __glintRef__; __glintDSL__;
            })"
          `);
        });
      });
    });
  });
});
