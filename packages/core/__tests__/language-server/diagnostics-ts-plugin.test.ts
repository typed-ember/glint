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
      await prepareDocument('component.hbs', 'handlebars', '{{@foo}}');
      await prepareDocument('component.ts', 'typescript', scriptContents);

      const server = await getSharedTestWorkspaceHelper();
      const hbsDoc = await server.openTextDocument('component.hbs', 'handlebars');
      const tsDoc = await server.openTextDocument('component.ts', 'typescript');

      let diagnostics = await server.sendDocumentDiagnosticRequest(hbsDoc.uri);

      expect(diagnostics).toMatchInlineSnapshot();

      await server.watchedFileDidChange(tsDoc.uri);

      diagnostics = await server.sendDocumentDiagnosticRequest(hbsDoc.uri);

      expect(diagnostics).toMatchInlineSnapshot();

      const defs = await server.sendDefinitionRequest(hbsDoc.uri, { line: 0, character: 5 });

      expect(defs).toMatchInlineSnapshot();
    });

    test('removing a backing module', async () => {
      await prepareDocument('component.hbs', 'handlebars', '{{@foo}}');
      await prepareDocument('component.ts', 'typescript', scriptContents);

      const server = await getSharedTestWorkspaceHelper();
      const hbsDoc = await server.openTextDocument('component.hbs', 'handlebars');
      const tsDoc = await server.openTextDocument('component.ts', 'typescript');

      let diagnostics = await server.sendDocumentDiagnosticRequest(hbsDoc.uri);

      expect(diagnostics).toMatchInlineSnapshot();

      await server.watchedFileWasRemoved(tsDoc.uri);

      diagnostics = await server.sendDocumentDiagnosticRequest(hbsDoc.uri);

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

  // skipping until we tackle two-file components
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

    await prepareDocument('controllers/foo.ts', 'typescript', script);
    await prepareDocument('templates/foo.hbs', 'handlebars', template);

    const server = await getSharedTestWorkspaceHelper();
    const tsDoc = await server.openTextDocument('controllers/foo.ts', 'typescript');
    const hbsDoc = await server.openTextDocument('templates/foo.hbs', 'handlebars');

    let scriptDiagnostics = await server.sendDocumentDiagnosticRequest(tsDoc.uri);
    let templateDiagnostics = await server.sendDocumentDiagnosticRequest(hbsDoc.uri);

    expect(scriptDiagnostics).toMatchInlineSnapshot();
    expect(templateDiagnostics).toMatchInlineSnapshot();

    await server.replaceTextDocument(hbsDoc.uri, template.replace('startupTimee', 'startupTime'));

    scriptDiagnostics = await server.sendDocumentDiagnosticRequest(tsDoc.uri);
    templateDiagnostics = await server.sendDocumentDiagnosticRequest(hbsDoc.uri);

    expect(scriptDiagnostics).toMatchInlineSnapshot();
    expect(templateDiagnostics).toMatchInlineSnapshot();
  });

  test('honors @glint-ignore and @glint-expect-error', async () => {
    const componentA = stripIndent`
      import Component from '@glimmer/component';

      export default class ComponentA extends Component {
        <template>
          {{! @glint-expect-error }}
          Welcome to app _code_v{{@version}}_/code_.
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

    await prepareDocument('component-a.gts', 'glimmer-ts', componentA);
    await prepareDocument('component-b.gts', 'glimmer-ts', componentB);

    const server = await getSharedTestWorkspaceHelper();
    const docA = await server.openTextDocument('component-a.gts', 'glimmer-ts');
    const docB = await server.openTextDocument('component-b.gts', 'glimmer-ts');

    let diagnosticsA = await server.sendDocumentDiagnosticRequest(docA.uri);
    let diagnosticsB = await server.sendDocumentDiagnosticRequest(docB.uri);

    expect(diagnosticsA).toMatchInlineSnapshot();
    expect(diagnosticsB).toMatchInlineSnapshot();

    await server.replaceTextDocument(
      docA.uri,
      componentA.replace('{{! @glint-expect-error }}', ''),
    );

    diagnosticsA = await server.sendDocumentDiagnosticRequest(docA.uri);
    diagnosticsB = await server.sendDocumentDiagnosticRequest(docB.uri);

    expect(diagnosticsA).toMatchInlineSnapshot();
    expect(diagnosticsB).toMatchInlineSnapshot();

    await server.replaceTextDocument(docA.uri, componentA);

    diagnosticsA = await server.sendDocumentDiagnosticRequest(docA.uri);
    diagnosticsB = await server.sendDocumentDiagnosticRequest(docB.uri);

    expect(diagnosticsA).toMatchInlineSnapshot();
    expect(diagnosticsB).toMatchInlineSnapshot();

    await server.replaceTextDocument(docA.uri, componentA.replace('{{@version}}', ''));

    diagnosticsA = await server.sendDocumentDiagnosticRequest(docA.uri);
    diagnosticsB = await server.sendDocumentDiagnosticRequest(docB.uri);

    expect(diagnosticsA).toMatchInlineSnapshot();
    expect(diagnosticsB).toMatchInlineSnapshot();
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

    await prepareDocument('component-a.gts', 'glimmer-ts', componentA);
    await prepareDocument('component-b.gts', 'glimmer-ts', componentB);

    const server = await getSharedTestWorkspaceHelper();
    const docA = await server.openTextDocument('component-a.gts', 'glimmer-ts');
    const docB = await server.openTextDocument('component-b.gts', 'glimmer-ts');

    let diagnosticsA = await server.sendDocumentDiagnosticRequest(docA.uri);
    let diagnosticsB = await server.sendDocumentDiagnosticRequest(docB.uri);

    expect(diagnosticsA).toMatchInlineSnapshot();
    expect(diagnosticsB).toMatchInlineSnapshot();

    await server.replaceTextDocument(
      docA.uri,
      componentA.replace('{{! @glint-expect-error }}', ''),
    );

    diagnosticsA = await server.sendDocumentDiagnosticRequest(docA.uri);
    diagnosticsB = await server.sendDocumentDiagnosticRequest(docB.uri);

    expect(diagnosticsA).toMatchInlineSnapshot();
    expect(diagnosticsB).toMatchInlineSnapshot();

    await server.replaceTextDocument(docA.uri, componentA);

    diagnosticsA = await server.sendDocumentDiagnosticRequest(docA.uri);
    diagnosticsB = await server.sendDocumentDiagnosticRequest(docB.uri);

    expect(diagnosticsA).toMatchInlineSnapshot();
    expect(diagnosticsB).toMatchInlineSnapshot();

    await server.replaceTextDocument(docA.uri, componentA.replace('{{@version}}', ''));

    diagnosticsA = await server.sendDocumentDiagnosticRequest(docA.uri);
    diagnosticsB = await server.sendDocumentDiagnosticRequest(docB.uri);

    expect(diagnosticsA).toMatchInlineSnapshot();
    expect(diagnosticsB).toMatchInlineSnapshot();
  });

  test('@glint-expect-error - unknown component reference', async () => {
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

    await prepareDocument('component-a.gts', 'glimmer-ts', componentA);

    const server = await getSharedTestWorkspaceHelper();
    const doc = await server.openTextDocument('component-a.gts', 'glimmer-ts');
    const diagnostics = await server.sendDocumentDiagnosticRequest(doc.uri);

    expect(diagnostics).toMatchInlineSnapshot();
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

    await prepareDocument('component-a.gts', 'glimmer-ts', componentA);

    const server = await getSharedTestWorkspaceHelper();
    const doc = await server.openTextDocument('component-a.gts', 'glimmer-ts');
    const diagnostics = await server.sendDocumentDiagnosticRequest(doc.uri);

    expect(diagnostics).toMatchInlineSnapshot();
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

    await prepareDocument('component-a.gts', 'glimmer-ts', componentA);

    const server = await getSharedTestWorkspaceHelper();
    const doc = await server.openTextDocument('component-a.gts', 'glimmer-ts');
    const diagnostics = await server.sendDocumentDiagnosticRequest(doc.uri);

    expect(diagnostics).toMatchInlineSnapshot();
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

    await prepareDocument('component-a.gts', 'glimmer-ts', componentA);

    const server = await getSharedTestWorkspaceHelper();
    const doc = await server.openTextDocument('component-a.gts', 'glimmer-ts');
    const diagnostics = await server.sendDocumentDiagnosticRequest(doc.uri);

    expect(diagnostics).toMatchInlineSnapshot();
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

    await prepareDocument('component-a.gts', 'glimmer-ts', componentA);

    const server = await getSharedTestWorkspaceHelper();
    const doc = await server.openTextDocument('component-a.gts', 'glimmer-ts');
    const diagnostics = await server.sendDocumentDiagnosticRequest(doc.uri);

    expect(diagnostics).toMatchInlineSnapshot();
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

    await prepareDocument('component-a.gts', 'glimmer-ts', componentA);

    const server = await getSharedTestWorkspaceHelper();
    const doc = await server.openTextDocument('component-a.gts', 'glimmer-ts');
    const diagnostics = await server.sendDocumentDiagnosticRequest(doc.uri);

    expect(diagnostics).toMatchInlineSnapshot();
  });

  test('passing wrong arg name to a Component should be an error -- suppressed with top-level @glint-expect-error', async () => {
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

    await prepareDocument('component-a.gts', 'glimmer-ts', componentA);

    const server = await getSharedTestWorkspaceHelper();
    const doc = await server.openTextDocument('component-a.gts', 'glimmer-ts');
    const diagnostics = await server.sendDocumentDiagnosticRequest(doc.uri);

    expect(diagnostics).toMatchInlineSnapshot();
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

    await prepareDocument('component-a.gts', 'glimmer-ts', componentA);

    const server = await getSharedTestWorkspaceHelper();
    const doc = await server.openTextDocument('component-a.gts', 'glimmer-ts');
    const diagnostics = await server.sendDocumentDiagnosticRequest(doc.uri);

    expect(diagnostics).toMatchInlineSnapshot();
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

    await prepareDocument('component-a.gts', 'glimmer-ts', componentA);

    const server = await getSharedTestWorkspaceHelper();
    const doc = await server.openTextDocument('component-a.gts', 'glimmer-ts');
    const diagnostics = await server.sendDocumentDiagnosticRequest(doc.uri);

    expect(diagnostics).toMatchInlineSnapshot();
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

    await prepareDocument('component-a.gts', 'glimmer-ts', componentA);

    const server = await getSharedTestWorkspaceHelper();
    const doc = await server.openTextDocument('component-a.gts', 'glimmer-ts');
    const diagnostics = await server.sendDocumentDiagnosticRequest(doc.uri);

    expect(diagnostics).toMatchInlineSnapshot();
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
          related.span.file = '${testWorkspacePath}' + related.span.file.slice(testWorkspacePath.length);
        }
      }
    }
  }

  return diagnosticsResponse.diagnostics;
}
