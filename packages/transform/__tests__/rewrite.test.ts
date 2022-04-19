import ts from 'typescript';
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

      let transformedModule = rewriteModule(ts, { script }, glimmerxEnvironment);

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

      let transformedModule = rewriteModule(ts, { script }, glimmerxEnvironment);

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

      let transformedModule = rewriteModule(ts, { script }, glimmerxEnvironment);

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

      let transformedModule = rewriteModule(ts, { script }, glimmerxEnvironment);

      expect(transformedModule?.errors.length).toBe(1);
      expect(transformedModule?.transformedContents).toBe(script.contents);

      expect(transformedModule?.getOriginalOffset(100)).toEqual({ offset: 100, source: script });
      expect(transformedModule?.getTransformedOffset(script.filename, 100)).toEqual(100);
    });

    test('outer variable capture', () => {
      let testEnvironment = new GlintEnvironment(['test'], {
        tags: {
          '@glint/test-env': {
            hbsCaptureAll: { typesSource: '@glint/test-env', globals: [] },
            hbsCaptureSome: { typesSource: '@glint/test-env', globals: ['global'] },
            hbsCaptureNone: { typesSource: '@glint/test-env' },
          },
        },
      });

      let script = {
        filename: 'test.ts',
        contents: stripIndent`
          import { hbsCaptureAll, hbsCaptureSome, hbsCaptureNone } from '@glint/test-env';

          const message = 'hello';

          hbsCaptureAll\`{{global}} {{message}}\`;
          hbsCaptureSome\`{{global}} {{message}}\`;
          hbsCaptureNone\`{{global}} {{message}}\`;
        `,
      };

      let transformedModule = rewriteModule(ts, { script }, testEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import { hbsCaptureAll, hbsCaptureSome, hbsCaptureNone } from '@glint/test-env';

        const message = 'hello';

        ({} as typeof import(\\"@glint/test-env\\")).template(function(𝚪, χ: typeof import(\\"@glint/test-env\\")) {
          hbsCaptureAll;
          χ.emitValue(χ.resolveOrReturn(global)({}));
          χ.emitValue(χ.resolveOrReturn(message)({}));
          𝚪; χ;
        });
        ({} as typeof import(\\"@glint/test-env\\")).template(function(𝚪, χ: typeof import(\\"@glint/test-env\\")) {
          hbsCaptureSome;
          χ.emitValue(χ.resolveOrReturn(χ.Globals[\\"global\\"])({}));
          χ.emitValue(χ.resolveOrReturn(message)({}));
          𝚪; χ;
        });
        ({} as typeof import(\\"@glint/test-env\\")).template(function(𝚪, χ: typeof import(\\"@glint/test-env\\")) {
          hbsCaptureNone;
          χ.emitValue(χ.resolveOrReturn(χ.Globals[\\"global\\"])({}));
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

      let transformedModule = rewriteModule(ts, { script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent extends Component {
        protected static '~template:MyComponent' = ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-ember-loose/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
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

      let transformedModule = rewriteModule(ts, { script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        class MyComponent extends Component {
        protected static '~template:MyComponent' = ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-ember-loose/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
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

      let transformedModule = rewriteModule(ts, { script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([]);
      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class MyComponent<K extends string> extends Component<{ value: K }> {
        protected static '~template:MyComponent' = ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function<K extends string>(𝚪: import(\\"@glint/environment-ember-loose/-private/dsl\\").ResolveContext<MyComponent<K>>, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
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

      let transformedModule = rewriteModule(ts, { script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors).toEqual([
        {
          message: 'Classes with an associated template must have a name',
          source: script,
          location: {
            start: script.contents.indexOf('export default'),
            end: script.contents.lastIndexOf('}') + 1,
          },
        },
      ]);

      expect(transformedModule?.transformedContents).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        export default class extends Component {
        protected static '~template:undefined' = ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          𝚪; χ;
        });
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
        "import Component from '@glimmer/component';
        export class MyComponent extends Component {}
        ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          χ.emitValue(χ.resolveOrReturn(χ.Globals[\\"hello\\"])({}));
          𝚪; χ;
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
        "import templateOnly from '@glimmer/component/template-only';

        export default templateOnly();
        ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-ember-loose/-private/dsl\\").ResolveContext<typeof import('./test').default>, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          𝚪; χ;
        }) as unknown;
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
        "export default Foo;
        ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-ember-loose/-private/dsl\\").ResolveContext<typeof import('./test').default>, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
          χ.emitValue(χ.resolveOrReturn(χ.Globals[\\"hello\\"])({}));
          𝚪; χ;
        }) as unknown;
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
        "import Component from '@glimmer/component';
        export default class MyComponent extends Component {
        protected static '~template:MyComponent' = ({} as typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-ember-loose/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-ember-loose/-private/dsl\\")) {
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

      let transformedModule = rewriteModule(ts, { script, template }, emberLooseEnvironment);

      expect(transformedModule?.errors.length).toBe(1);
      expect(transformedModule?.transformedContents).toBe(script.contents);

      expect(transformedModule?.getOriginalOffset(50)).toEqual({ offset: 50, source: script });
      expect(transformedModule?.getTransformedOffset(script.filename, 50)).toEqual(50);
      expect(transformedModule?.getTransformedOffset(template.filename, 5)).toEqual(
        script.contents.lastIndexOf('}')
      );
    });
  });

  describe('custom file format', () => {
    test('embedded gts-like templates', () => {
      let customEnv = GlintEnvironment.load('custom-test');
      let script = {
        filename: 'foo.custom',
        contents: stripIndent`
          class MyComponent {
            public template = <template>
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

        | Mapping: Template
        |  hbs(40:92):   <template>\\\\n    Hello, {{this.target}}!\\\\n  </template>
        |  ts(40:348):   ({} as typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")).template(function(𝚪: import(\\"@glint/environment-glimmerx/-private/dsl\\").ResolveContext<MyComponent>, χ: typeof import(\\"@glint/environment-glimmerx/-private/dsl\\")) {\\\\n  χ.emitValue(χ.resolveOrReturn(𝚪.this.target)({}));\\\\n  𝚪; χ;\\\\n}) as unknown
        |
        | | Mapping: Identifier
        | |  hbs(40:40):
        | |  ts(194:205):  MyComponent
        | |
        | | Mapping: MustacheStatement
        | |  hbs(62:77):   {{this.target}}
        | |  ts(272:324):  χ.emitValue(χ.resolveOrReturn(𝚪.this.target)({}))
        | |
        | | | Mapping: PathExpression
        | | |  hbs(64:75):   this.target
        | | |  ts(304:318):  𝚪.this.target
        | | |
        | | | | Mapping: Identifier
        | | | |  hbs(64:68):   this
        | | | |  ts(307:311):  this
        | | | |
        | | | | Mapping: Identifier
        | | | |  hbs(69:75):   target
        | | | |  ts(312:318):  target
        | | | |
        | | |
        | |
        |"
      `);
    });

    test('emit metadata', () => {
      let metadataEnv = new GlintEnvironment(['test'], {
        tags: {
          '@glint/test': {
            hbs: {
              typesSource: '@glint/test/dsl',
              globals: [],
            },
          },
        },
        extensions: {
          '.custom': {
            kind: 'typed-script',
            transform: (data, { ts, context, setEmitMetadata }) =>
              function visit(original) {
                let node: ts.Node = ts.visitEachChild(original, visit, context);

                if (ts.isTaggedTemplateExpression(node)) {
                  setEmitMetadata(node, {
                    prepend: `({ customWrappedTemplate: `,
                    append: ` })`,
                  });
                }

                return node;
              },
          },
        },
      });

      let script = {
        filename: 'foo.custom',
        contents: stripIndent`
          import { hbs } from '@glint/test';

          let target = 'world';

          export default hbs\`
            Hello, {{target}}.
          \`;
        `,
      };

      let rewritten = rewriteModule(ts, { script }, metadataEnv);

      expect(rewritten?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: Template
        |  hbs(74:101):  hbs\`\\\\n  Hello, {{target}}.\\\\n\`
        |  ts(74:269):   ({ customWrappedTemplate: ({} as typeof import(\\"@glint/test/dsl\\")).template(function(𝚪, χ: typeof import(\\"@glint/test/dsl\\")) {\\\\n  hbs;\\\\n  χ.emitValue(χ.resolveOrReturn(target)({}));\\\\n  𝚪; χ;\\\\n}) })
        |
        | | Mapping: MustacheStatement
        | |  hbs(88:98):   {{target}}
        | |  ts(209:253):  χ.emitValue(χ.resolveOrReturn(target)({}))
        | |
        | | | Mapping: PathExpression
        | | |  hbs(90:96):   target
        | | |  ts(241:247):  target
        | | |
        | | | | Mapping: Identifier
        | | | |  hbs(90:96):   target
        | | | |  ts(241:247):  target
        | | | |
        | | |
        | |
        |"
      `);
    });

    test('with preprocessing and setEmitMetadata: templateLocation', () => {
      let metadataEnv = new GlintEnvironment(['test'], {
        tags: {
          '@glint/test': {
            hbs: {
              typesSource: '@glint/test/dsl',
              globals: [],
            },
          },
        },
        extensions: {
          '.custom': {
            kind: 'typed-script',
            preprocess: (source) => (
              // this intentionally does not pad so that an offset of 2 is required for the debug string to line up
              // (even though this makes the hbs line in Mapping: Template weird)
              { contents: source.replace('<tmpl>', 'hbs`').replace('</tmpl>', '`') }
            ),
            transform: (data, { ts, context, setEmitMetadata }) =>
              function visit(original) {
                let node: ts.Node = ts.visitEachChild(original, visit, context);

                if (ts.isTaggedTemplateExpression(node)) {
                  setEmitMetadata(node, {
                    templateLocation: {
                      start: node.getStart() + 2,
                      end: node.getEnd() + 2,
                    },
                  });
                }

                return node;
              },
          },
        },
      });

      let script = {
        filename: 'foo.custom',
        contents: stripIndent`
          import { hbs } from '@glint/test';

          let target = 'world';

          export default <tmpl>
            Hello, {{target}}.
          </tmpl>
        `,
      };

      let rewritten = rewriteModule(ts, { script }, metadataEnv);

      expect(rewritten?.toDebugString()).toMatchInlineSnapshot(`
        "TransformedModule

        | Mapping: Template
        |  hbs(76:103):  mpl>\\\\n  Hello, {{target}}.\\\\n<
        |  ts(76:242):   ({} as typeof import(\\"@glint/test/dsl\\")).template(function(𝚪, χ: typeof import(\\"@glint/test/dsl\\")) {\\\\n  hbs;\\\\n  χ.emitValue(χ.resolveOrReturn(target)({}));\\\\n  𝚪; χ;\\\\n})
        |
        | | Mapping: MustacheStatement
        | |  hbs(90:100):  {{target}}
        | |  ts(185:229):  χ.emitValue(χ.resolveOrReturn(target)({}))
        | |
        | | | Mapping: PathExpression
        | | |  hbs(92:98):   target
        | | |  ts(217:223):  target
        | | |
        | | | | Mapping: Identifier
        | | | |  hbs(92:98):   target
        | | | |  ts(217:223):  target
        | | | |
        | | |
        | |
        |"
      `);
    });
  });
});
