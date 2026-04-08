import { stripIndent } from 'common-tags';
import {
  requestFullSemanticModeDiagnostics,
  teardownFullSemanticModeWorkspaceAfterEach,
  prepareDocumentFullSemanticMode,
  getFullSemanticModeWorkspaceHelper,
  extractCursor,
} from 'glint-monorepo-test-utils';
import { afterEach, describe, expect, test } from 'vitest';
import { Position } from '@volar/language-server';

describe('Language Server: Full Semantic Mode (createTypeScriptProject)', () => {
  // Full semantic mode startup (createTypeScriptProject) takes longer than hybrid mode.
  afterEach(teardownFullSemanticModeWorkspaceAfterEach, 60_000);

  test('reports a type error in an inline template', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      type ApplicationArgs = { version: string };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        <template>
          Welcome to app <code>v{{@version}}</code>.
          The current time is {{this.startupTimee}}.
        </template>
      }
    `;

    const diagnostics = await requestFullSemanticModeDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    const typeError = diagnostics.find((d: any) => d.code === 2551);
    expect(typeError).toBeDefined();
    expect(typeError.message).toContain('startupTimee');
    // Use "Did you mean" phrasing to avoid false positive: 'startupTime' is a substring of 'startupTimee'
    expect(typeError.message).toContain("Did you mean 'startupTime'");
  });

  test('reports no diagnostics for a valid template', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      type ApplicationArgs = { version: string };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        <template>
          Welcome to app <code>v{{@version}}</code>.
          The current time is {{this.startupTime}}.
        </template>
      }
    `;

    const diagnostics = await requestFullSemanticModeDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    expect(diagnostics).toHaveLength(0);
  });

  test('syntax error in template is reported', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        <template>
          <div>SYNTAX {{ERROR</div>
        </template>
      }
    `;

    const diagnostics = await requestFullSemanticModeDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    const syntaxError = diagnostics.find((d: any) => d.message?.includes('Parse error'));
    expect(syntaxError).toBeDefined();
    expect(syntaxError.severity).toBe(1);
  });

  test('plugin deactivates for project without glint config', async () => {
    const gtsCode = stripIndent`
      import Component from '@glimmer/component';

      export default class Application extends Component {
        private startupTime = new Date().toISOString();

        <template>
          The current time is {{this.startupTimee}}.
        </template>
      }
    `;

    const gtsDiagnostics = await requestFullSemanticModeDiagnostics(
      'ts-template-imports-app-no-config/src/empty-fixture.gts',
      'glimmer-ts',
      gtsCode,
    );

    // Without glint config, the ember language plugin is not registered, so TypeScript
    // cannot process .gts files (no extraFileExtensions for .gts). Template type-checking
    // errors (2551/2339) should not be reported.
    const templateTypeErrors = gtsDiagnostics.filter((d: any) => d.code === 2551 || d.code === 2339);
    expect(templateTypeErrors).toHaveLength(0);

    // Verify TypeScript is still active for plain .ts files even when glint is deactivated.
    // We check a .ts file (not .gts) because without the ember plugin, TypeScript cannot
    // process .gts files at all — but it still handles .ts files via its native project support.
    const tsDiagnostics = await requestFullSemanticModeDiagnostics(
      'ts-template-imports-app-no-config/src/type-error.ts',
      'typescript',
      `const x: number = 'not a number';`,
    );
    const tsTypeError = tsDiagnostics.find((d: any) => d.code === 2322);
    expect(tsTypeError).toBeDefined();
  });

  test('completions are provided in full semantic mode', async () => {
    const [offset, content] = extractCursor(stripIndent`
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        private startupTime = new Date().toISOString();

        <template>
          {{this.startup%}}
        </template>
      }
    `);

    const server = await getFullSemanticModeWorkspaceHelper();
    const document = await prepareDocumentFullSemanticMode(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      content,
    );

    // Convert character offset to LSP Position
    const textBefore = content.slice(0, offset);
    const lines = textBefore.split('\n');
    const position: Position = {
      line: lines.length - 1,
      character: lines[lines.length - 1].length,
    };

    const completions = await server.sendCompletionRequest(document.uri, position);
    expect(completions).not.toBeNull();
    const items = completions?.items ?? [];
    const startupTimeCompletion = items.find((item: any) => item.label === 'startupTime');
    expect(startupTimeCompletion).toBeDefined();
  });

  test('hover info is provided in full semantic mode', async () => {
    const [offset, content] = extractCursor(stripIndent`
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        private startupTime% = new Date().toISOString();

        <template>
          {{this.startupTime}}
        </template>
      }
    `);

    const server = await getFullSemanticModeWorkspaceHelper();
    const document = await prepareDocumentFullSemanticMode(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      content,
    );

    const textBefore = content.slice(0, offset);
    const lines = textBefore.split('\n');
    const position: Position = {
      line: lines.length - 1,
      character: lines[lines.length - 1].length,
    };

    const hover = await server.sendHoverRequest(document.uri, position);
    expect(hover).not.toBeNull();
    const hoverText = JSON.stringify(hover?.contents ?? '');
    expect(hoverText).toContain('startupTime');
    // TS type annotation in hover confirms TS analysis is active, not just a text match
    expect(hoverText).toContain(': string');
  });

  test('passing wrong arg to component is an error in full semantic mode', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      interface GreetingSignature {
        Args: { target: string };
      }

      class Greeting extends Component<GreetingSignature> {
        <template>{{@target}}</template>
      }

      export default class extends Component {
        <template>
          <Greeting @target2="world" />
        </template>
      }
    `;

    const diagnostics = await requestFullSemanticModeDiagnostics(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      code,
    );

    const argError = diagnostics.find((d: any) => d.code === 2561 || d.code === 2353);
    expect(argError).toBeDefined();
    expect(argError.message).toContain('target2'); // the unknown argument passed
    expect(argError.message).toMatch(/\btarget\b/); // the expected argument in the type shape
  });
});
