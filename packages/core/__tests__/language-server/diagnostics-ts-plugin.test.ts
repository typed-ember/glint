import {
  getSharedTestWorkspaceHelper,
  teardownSharedTestWorkspaceAfterEach,
  prepareDocument,
  testWorkspacePath,
  extractCursor,
  extractCursors,
} from 'glint-monorepo-test-utils';
import { describe, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';

describe('Language Server: Diagnostics (ts plugin)', () => {
  afterEach(teardownSharedTestWorkspaceAfterEach);

  // skipping until we tackle two-file components
  describe.skip('external file changes', () => {
    const scriptContents = stripIndent`
      import templateOnly from '@ember/component/template-only';

      interface TemplateOnlySignature {
        Args: { foo: string };
      }

      export default templateOnly<TemplateOnlySignature>();
    `;

    test('adding a backing module', async () => {
      const hbsCode = '{{@foo}}';

      await prepareDocument('component.ts', 'typescript', scriptContents);

      const diagnostics = await requestDiagnostics('component.hbs', 'handlebars', hbsCode);

      expect(diagnostics).toMatchInlineSnapshot();
    });

    test('removing a backing module', async () => {
      const hbsCode = '{{@foo}}';

      await prepareDocument('component.ts', 'typescript', scriptContents);

      const diagnostics = await requestDiagnostics('component.hbs', 'handlebars', hbsCode);

      expect(diagnostics).toMatchInlineSnapshot();
    });
  });

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

    const diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
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
                "file": "\${testWorkspacePath}/ts-template-imports-app/src/ephemeral-index.gts",
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

  // Seems like the TS Plugin isn't kicking in on this one for some reason;
  // lots of diagnostics on uncompiled Handlebars. Maybe for diagnostics there are
  // race conditions?
  test.skip('reports diagnostics for a companion template type error', async () => {
    const script = stripIndent`
      import Component from '@glimmer/component';

      type ApplicationArgs = {
        version: string;
      };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();
      }
    `;

    const template = stripIndent`
      Welcome to app v{{@version}}.
      The current time is {{this.startupTimee}}.
    `;

    await prepareDocument('ts-ember-app/app/templates/ephemeral.hbs', 'handlebars', template);
    await prepareDocument('ts-ember-app/app/controllers/ephemeral.ts', 'typescript', script);

    const diagnostics = await requestDiagnostics('templates/ephemeral.hbs', 'handlebars', template);

    expect(diagnostics).toMatchInlineSnapshot();
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

    const diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
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

    const diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
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

    const diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
      'glimmer-ts',
      componentA,
    );

    expect(diagnostics).toMatchInlineSnapshot(`[]`);
  });

  // Regression / breaking change since Glint 2
  test.skip('@glint-ignore and @glint-expect-error skip over simple element declarations', async () => {
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

    const diagnosticsA = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
      'glimmer-ts',
      componentA,
    );
    expect(diagnosticsA).toMatchInlineSnapshot();

    const diagnosticsB = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
      'glimmer-ts',
      componentB,
    );
    expect(diagnosticsB).toMatchInlineSnapshot();
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

    const diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
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

    const diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
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

    const diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
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

    const diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
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
            "offset": 17,
          },
          "relatedInformation": [
            {
              "category": "error",
              "code": 6236,
              "message": "Arguments for the rest parameter 'args' were not provided.",
              "span": {
                "end": {
                  "line": 24,
                  "offset": 49,
                },
                "file": "\${testWorkspacePath}ronment-ember-template-imports/-private/dsl/index.d.ts",
                "start": {
                  "line": 24,
                  "offset": 5,
                },
              },
            },
          ],
          "start": {
            "line": 15,
            "offset": 5,
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

    const diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
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

    const diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
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

    const diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
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

    const diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
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

    const diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
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

    const diagnostics = await requestDiagnostics(
      'ts-template-imports-app/src/ephemeral-index.gts',
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
});

async function requestDiagnostics(fileName: string, languageId: string, content: string) {
  const workspaceHelper = await getSharedTestWorkspaceHelper();

  const diagnosticsReceivedPromise = new Promise<any>((resolve) => {
    workspaceHelper.setTsserverEventHandler((e) => {
      if (e.event == 'semanticDiag') {
        // TODO: double check filename is for the correct one?
        // Perhaps there are race conditions.
        resolve(e.body);
      }
    });
  });

  let document = await prepareDocument(fileName, languageId, content);

  // `geterr`'s response doesn't contain diagnostic data; diagnostic
  // data comes in the form of events.
  const res = await workspaceHelper.tsserver.message({
    seq: workspaceHelper.nextSeq(),
    command: 'geterr',
    arguments: {
      delay: 0,
      files: [URI.parse(document.uri).fsPath],
    },
  });
  expect(res.event).toEqual('requestCompleted');

  const diagnosticsResponse = await diagnosticsReceivedPromise;

  for (const diagnostic of diagnosticsResponse.diagnostics) {
    if (diagnostic.relatedInformation) {
      for (const related of diagnostic.relatedInformation) {
        if (related.span) {
          related.span.file =
            '${testWorkspacePath}' + related.span.file.slice(testWorkspacePath.length);
        }
      }
    }
  }

  return diagnosticsResponse.diagnostics;
}
