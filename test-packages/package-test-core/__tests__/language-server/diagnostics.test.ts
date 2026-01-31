import { stripIndent } from 'common-tags';
import {
  requestLanguageServerDiagnostics,
  requestTsserverDiagnostics,
  teardownSharedTestWorkspaceAfterEach,
  ensureNoOpenDocuments,
} from 'glint-monorepo-test-utils';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

describe('Language Server: Diagnostics (ts plugin)', () => {
  beforeEach(ensureNoOpenDocuments);
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test('reports diagnostics for an inline template type error', async () => {
    const code = stripIndent`
      // Here's a leading comment to make sure we handle trivia right
      import Component from '@glimmer/component';

      type ApplicationArgs = {
        version: string;
      };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        <template>
          Welcome to app <code>v{{@version}}</code>.
          The current time is {{this.startupTimee}}.
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "code": 2551,
          "end": {
            "line": 13,
            "offset": 44,
          },
          "relatedInformation": [
            {
              "category": "message",
              "code": 2728,
              "message": "'startupTime' is declared here.",
              "span": {
                "end": {
                  "line": 9,
                  "offset": 22,
                },
                "file": "\${repoRootPath}/test-packages/ts-template-imports-app/src/empty-fixture.gts",
                "start": {
                  "line": 9,
                  "offset": 11,
                },
              },
            },
          ],
          "start": {
            "line": 13,
            "offset": 32,
          },
          "text": "Property 'startupTimee' does not exist on type 'Application'. Did you mean 'startupTime'?",
        },
      ]
    `);
  });

  test('honors @glint-expect-error / ignore shared test throws error', async () => {
    const componentA = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentA extends Component {
        <template>
          Welcome to app _code_v{{@version}}_/code_.
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      componentA,
    );

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "code": 2339,
          "end": {
            "line": 5,
            "offset": 37,
          },
          "start": {
            "line": 5,
            "offset": 30,
          },
          "text": "Property 'version' does not exist on type '{}'.",
        },
      ]
    `);
  });

  test('honors @glint-expect-error', async () => {
    const componentA = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentA extends Component {
        <template>
          {{! @glint-expect-error foo bar }}
          Welcome to app _code_v{{@version}}_/code_.
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      componentA,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });

  test('honors @glint-ignore', async () => {
    const componentA = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentA extends Component {
        <template>
          {{! @glint-ignore foo bar }}
          Welcome to app _code_v{{@version}}_/code_.
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      componentA,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });

  test('@glint-ignore and @glint-expect-error skip over simple element declarations', async () => {
    const componentA = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentA extends Component {
        <template>
          {{! @glint-expect-error }}
          Welcome to app <code>v{{@version}}</code>.
        </template>
      }
    `;

    const componentB = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentB extends Component {
        public startupTime = new Date().toISOString();

        <template>
          {{! @glint-ignore: this looks like a typo but for some reason it isn't }}
          The current time is {{this.startupTimee}}.
        </template>
      }
    `;

    const diagnosticsA = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      componentA,
    );
    expect(diagnosticsA).toMatchInlineSnapshot(`[]`);

    const diagnosticsB = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      componentB,
    );
    expect(diagnosticsB).toMatchInlineSnapshot(`[]`);
  });

  test('@glint-expect-error - unknown component reference - error on component does not mask unknownReference', async () => {
    const componentA = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentA extends Component {
        <template>
          {{! @glint-expect-error }}
          <Wat>
            {{this.unknownReference}}
          </Wat>
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      componentA,
    );

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "code": 2339,
          "end": {
            "line": 7,
            "offset": 30,
          },
          "start": {
            "line": 7,
            "offset": 14,
          },
          "text": "Property 'unknownReference' does not exist on type 'ComponentA'.",
        },
      ]
    `);
  });

  test('it should be possible to reference the attr name in the glint-expect-error without deactivating the directive', async () => {
    const componentA = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentA extends Component {
        <template>
          <div
            {{! @glint-expect-error there is a problem with unknownAttr }}
            unknownAttr="wat">
          </div>
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      componentA,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });

  test('passing args to vanilla Component should be an error', async () => {
    const componentA = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentA extends Component {
        <template>
          <Component
            @foo={{123}} />
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      componentA,
    );

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "code": 2554,
          "end": {
            "line": 6,
            "offset": 22,
          },
          "start": {
            "line": 5,
            "offset": 5,
          },
          "text": "Expected 0 arguments, but got 1.",
        },
      ]
    `);
  });

  test('passing args to vanilla Component should be an error -- suppressed with @glint-expect-error', async () => {
    const componentA = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentA extends Component {
        <template>
        {{! @glint-expect-error }}
          <Component
            @foo={{123}} />
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      componentA,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });

  test('passing no args to a Component with args should be an error', async () => {
    const componentA = stripIndent`
      import Component from '@glimmer/component';

      interface GreetingSignature {
        Args: { target: string };
      }
        
      class Greeting extends Component<GreetingSignature> {
        <template>
          {{@target}}
        </template>
      }

      export default class extends Component {
        <template>
          <Greeting />
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      componentA,
    );

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "code": 2554,
          "end": {
            "line": 15,
            "offset": 14,
          },
          "relatedInformation": [
            {
              "category": "error",
              "code": 6236,
              "message": "Arguments for the rest parameter 'args' were not provided.",
              "span": {
                "end": {
                  "line": 29,
                  "offset": 49,
                },
                "file": "\${repoRootPath}/node_modules/.pnpm/@glint+_cfa67f021c0b7c85b2e0fbc9321c543b/node_modules/@glint/ember-tsc/types/-private/dsl/index.d.ts",
                "start": {
                  "line": 29,
                  "offset": 5,
                },
              },
            },
          ],
          "start": {
            "line": 15,
            "offset": 6,
          },
          "text": "Expected 1 arguments, but got 0.",
        },
      ]
    `);
  });

  test('passing no args to a Component with args should be an error -- suppressed with @glint-expect-error', async () => {
    const componentA = stripIndent`
      import Component from '@glimmer/component';

      interface GreetingSignature {
        Args: { target: string };
      }
        
      class Greeting extends Component<GreetingSignature> {
        <template>
          {{@target}}
        </template>
      }

      export default class extends Component {
        <template>
          {{! @glint-expect-error }}
          <Greeting />
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      componentA,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });

  test('passing wrong arg name to a Component should be an error', async () => {
    const componentA = stripIndent`
      import Component from '@glimmer/component';

      interface GreetingSignature {
        Args: { target: string };
      }
        
      class Greeting extends Component<GreetingSignature> {
        <template>
          {{@target}}
        </template>
      }

      export default class extends Component {
        <template>
          <Greeting @target2="world" />
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      componentA,
    );

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "code": 2561,
          "end": {
            "line": 15,
            "offset": 23,
          },
          "start": {
            "line": 15,
            "offset": 16,
          },
          "text": "Object literal may only specify known properties, but 'target2' does not exist in type 'NamedArgs<{ target: string; }>'. Did you mean to write 'target'?",
        },
      ]
    `);
  });

  test('passing wrong arg name to a Component should be an error -- suppressed with top-level @glint-expect-error', async () => {
    /**
     * The specified/desired behavior here is difficult to implement due to the complexities and assymmetries between
     * the expected behavior of `{{! @glint-expect-error}}` within a template and the transformed/generated
     * `// @ts-expect-error` that is produced. The region of code covered by `glint-expect-error` might be a complex
     * component invocation that includes attributes, modifiers, and/or comments, which can themselves be individually
     * guarded by inline `{{! @glint-expect-error}}` directives within the element open tag.
     *
     * The end result of this is that there are cases where the top-level `{{! @glint-expect-error}}` preceding a
     * component invocation might also cover and area of effect overlapping those of inline directives, and keeping
     * these areas of effect totally separate is not possible.
     */

    const componentA = stripIndent`
      import Component from '@glimmer/component';

      interface GreetingSignature {
        Args: { target: string };
      }
        
      class Greeting extends Component<GreetingSignature> {
        <template>
          {{@target}}
        </template>
      }

      export default class extends Component {
        <template>
          {{! @glint-expect-error }}
          <Greeting @target2="world" />
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      componentA,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });

  test('passing wrong arg name to a Component should be an error -- suppressed with inline @glint-expect-error with element open tag', async () => {
    const componentA = stripIndent`
      import Component from '@glimmer/component';

      interface GreetingSignature {
        Args: { target: string };
      }
        
      class Greeting extends Component<GreetingSignature> {
        <template>
          {{@target}}
        </template>
      }

      export default class extends Component {
        <template>
          <Greeting
            {{! @glint-expect-error }}
            @target2="world" />
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      componentA,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });

  test('passing wrong arg name to a Component should be an error followed by passing the correct arg name -- suppressed with inline @glint-expect-error with element open tag', async () => {
    const componentA = stripIndent`
      import Component from '@glimmer/component';

      interface GreetingSignature {
        Args: { target: string };
      }
        
      class Greeting extends Component<GreetingSignature> {
        <template>
          {{@target}}
        </template>
      }

      export default class extends Component {
        <template>
          <Greeting
            {{! @glint-expect-error }}
            @target2="world"
            @target="hello" />
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      componentA,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });

  test('@glint-expect-error - open element tag inline directive', async () => {
    const componentA = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentA extends Component {
        <template>
          <Component
            {{! @glint-expect-error }}
            @foo={{unknownReference}} />
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      componentA,
    );

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "code": 2554,
          "end": {
            "line": 7,
            "offset": 35,
          },
          "start": {
            "line": 5,
            "offset": 5,
          },
          "text": "Expected 0 arguments, but got 1.",
        },
      ]
    `);
  });

  test('unused @glint-expect-error triggers a diagnostic', async () => {
    const componentA = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentA extends Component {
        <template>
          {{! @glint-expect-error }}
          <Component />
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      componentA,
    );

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "code": 2578,
          "end": {
            "line": 5,
            "offset": 31,
          },
          "start": {
            "line": 5,
            "offset": 5,
          },
          "text": "Unused '@ts-expect-error' directive.",
        },
      ]
    `);
  });

  test('svg does not produce false positives', async () => {
    const code = stripIndent`
    import Component from '@glimmer/component';

    export default class MyComponent {
      <template>
        <svg version="1.1"
            width="300" height="200">

          <rect width="100%" height="100%" fill="red" class="foo" />
        </svg>
      </template>
    }
  `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(JSON.stringify(diagnostics)).toBe('[]');
    expect(diagnostics.length).toBe(0);
  });

  test('mathml does not produce false positives', async () => {
    let componentA = stripIndent`
      export const MathMLExample = <template>
        <span>x</span>

        <math display="block">
          <mfrac>
            <mrow>
              <mi>a</mi>
              <mo>+</mo>
              <mn>2</mn>
            </mrow>
            <mrow>
              <mn>3</mn>
              <mo>−</mo>
              <mi>b</mi>
            </mrow>
          </mfrac>
        </math>

        <span>x</span>
      </template>
      `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
      'glimmer-ts',
      componentA,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });

  test('errors with modifiers are properly reported', async () => {
    const code = stripIndent`
    import Component from '@glimmer/component';
    import Modifier from 'ember-modifier';

    class NoopModifier extends Modifier<{
      Element: HTMLCanvasElement;
      Args: {
        Positional: [number];
        Named: { foo: string };
      };
    }> {}

    export default class MyComponent extends Component {
      <template>
        <div {{NoopModifier}}>foo</div>
      </template>
    }
  `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "code": 2554,
          "end": {
            "line": 14,
            "offset": 26,
          },
          "start": {
            "line": 14,
            "offset": 10,
          },
          "text": "Expected 3 arguments, but got 1.",
        },
      ]
    `);
  });

  test('errors with modifiers can be suppressed with @glint-expect-error', async () => {
    const code = stripIndent`
    import Component from '@glimmer/component';
    import Modifier from 'ember-modifier';

    class NoopModifier extends Modifier<{
      Element: HTMLCanvasElement;
      Args: {
        Positional: [number];
        Named: { foo: string };
      };
    }> {}

    export default class MyComponent extends Component {
      <template>
        {{! @glint-expect-error }}
        <div {{NoopModifier}}>foo</div>
      </template>
    }
  `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });

  test('syntax error diagnostics within template tag show up in right spot', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        <template>
          <div>SYNTAX {{ERROR</div>
        </template>
      }
    `;

    const diagnostics = await requestLanguageServerDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "code": 9999,
          "data": {
            "documentUri": "volar-embedded-content://gts/PATH_TO_FILE",
            "isFormat": false,
            "original": {},
            "pluginIndex": 3,
            "uri": "file:///path/to/EPHEMERAL_TEST_PROJECT/test-packages/ts-template-imports-app/src/empty-fixture.gts",
            "version": 0,
          },
          "message": "Parse error on line 2:
          <div>SYNTAX {{ERROR</div>  
      ------------------^
      Expecting 'OPEN_SEXPR', 'ID', 'OPEN_ARRAY', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'",
          "range": {
            "end": {
              "character": 18,
              "line": 4,
            },
            "start": {
              "character": 16,
              "line": 4,
            },
          },
          "severity": 1,
          "source": "glint",
        },
      ]
    `);
  });

  test('syntax error diagnostics due to broken or unmatched template tag show up in right spot', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        <template>
          <div></div>
        </template
      }
    `;

    const diagnostics = await requestLanguageServerDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "code": 9999,
          "data": {
            "documentUri": "volar-embedded-content://gts/PATH_TO_FILE",
            "isFormat": false,
            "original": {},
            "pluginIndex": 3,
            "uri": "file:///path/to/EPHEMERAL_TEST_PROJECT/test-packages/ts-template-imports-app/src/empty-fixture.gts",
            "version": 0,
          },
          "message": "Unexpected token \`<lexing error: Error { error: (Span { lo: BytePos(142), hi: BytePos(142), ctxt: #0 }, Eof) }>\`. Expected content tag

       6 │   </template
       7 │ }
         ╰────",
          "range": {
            "end": {
              "character": 8,
              "line": 5,
            },
            "start": {
              "character": 7,
              "line": 5,
            },
          },
          "severity": 1,
          "source": "glint",
        },
      ]
    `);
  });

  test('HTML attribute type-checking', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      interface ElementlessComponentSignature {
      }

      class ElementlessComponent extends Component<ElementlessComponentSignature> {
        <template>
          <div>ElementlessComponent</div>
        </template>
      }

      interface ElementedComponentSignature {
        Element: HTMLDivElement;
      }

      class ElementedComponent extends Component<ElementedComponentSignature> {
        <template>
          <div>ElementedComponent</div>
        </template>
      }

      export default class AttributesTest extends Component {
        private message = 'Hello';

        <template>
          <ElementlessComponent class="bar" />
          <ElementedComponent foo="bar" />
          <ElementedComponent class="bar" />
        </template>
      }
    `;

    const diagnostics = await requestTsserverDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics).toMatchInlineSnapshot(`
      [
        {
          "category": "error",
          "code": 2345,
          "end": {
            "line": 26,
            "offset": 38,
          },
          "start": {
            "line": 26,
            "offset": 27,
          },
          "text": "An Element must be specified in the component signature in order to pass in HTML attributes.
      Argument of type 'unknown' is not assignable to parameter of type 'Element'.",
        },
        {
          "category": "error",
          "code": 2353,
          "end": {
            "line": 27,
            "offset": 28,
          },
          "start": {
            "line": 27,
            "offset": 25,
          },
          "text": "Object literal may only specify known properties, and 'foo' does not exist in type 'Partial<WithDataAttributes<HTMLDivElementAttributes | HTMLHeadingElementAttributes | HTMLParagraphElementAttributes | HTMLTableCaptionElementAttributes>>'.",
        },
      ]
    `);
  });
});
