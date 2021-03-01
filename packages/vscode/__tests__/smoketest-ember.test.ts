import { commands, languages, Position, ViewColumn, window, Uri, Range } from 'vscode';
import path from 'path';
import { waitUntil } from './helpers/async';

describe('Smoke test: Ember', () => {
  jest.setTimeout(30_000);

  const rootDir = path.resolve(__dirname, '../__fixtures__/ember-app');

  afterEach(async () => {
    await commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('introducing an error', async () => {
    let scriptURI = Uri.file(`${rootDir}/app/components/foo.ts`);
    let templateURI = Uri.file(`${rootDir}/app/components/foo.hbs`);

    // Open the script and the template
    let scriptEditor = await window.showTextDocument(scriptURI, { viewColumn: ViewColumn.One });
    await window.showTextDocument(templateURI, { viewColumn: ViewColumn.Two });

    // Ensure neither has any diagnostic messages
    expect(languages.getDiagnostics(scriptURI)).toEqual([]);
    expect(languages.getDiagnostics(templateURI)).toEqual([]);

    // Comment out a property in the script that's referenced in the template
    await scriptEditor.edit((edit) => {
      edit.insert(new Position(3, 2), '// ');
    });

    // Wait for a diagnostic to appear in the template
    await waitUntil(() => languages.getDiagnostics(templateURI).length);

    // Ensure the diagnostic is the error we expect
    expect(languages.getDiagnostics(scriptURI)).toEqual([]);
    expect(languages.getDiagnostics(templateURI)).toMatchObject([
      {
        message: "Property 'message' does not exist on type 'MyComponent'.",
        source: 'glint:ts(2339)',
        range: new Range(0, 7, 0, 14),
      },
    ]);
  });
});
