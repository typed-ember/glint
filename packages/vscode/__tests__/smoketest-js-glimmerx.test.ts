import {
  commands,
  languages,
  Position,
  ViewColumn,
  window,
  Uri,
  Range,
} from 'vscode';
import path from 'path';
import { waitUntil } from './helpers/async';

describe('Smoke test: js-glimmerx', () => {
  jest.setTimeout(30_000);

  const rootDir = path.resolve(__dirname, '../__fixtures__/js-glimmerx-app');

  afterEach(async () => {
    while (window.activeTextEditor) {
      await commands.executeCommand('workbench.action.files.revert');
      await commands.executeCommand('workbench.action.closeActiveEditor');
    }
  });

  describe('diagnostics for errors', () => {
    test('component template', async () => {
      let scriptURI = Uri.file(`${rootDir}/src/SimpleComponent.js`);

      // Open the script and the template
      let scriptEditor = await window.showTextDocument(scriptURI, { viewColumn: ViewColumn.One });

      // Ensure neither has any diagnostic messages
      expect(languages.getDiagnostics(scriptURI)).toEqual([]);

      // Comment out a property in the script that's referenced in the template
      await scriptEditor.edit((edit) => {
        edit.insert(new Position(12, 39), ' {{@undocumentedProperty}}');
      });

      // Wait for a diagnostic to appear in the template
      await waitUntil(() => languages.getDiagnostics(scriptURI).length);

      // Ensure the diagnostic is the error we expect
      expect(languages.getDiagnostics(scriptURI)).toMatchObject([
        {
          message: "Property 'undocumentedProperty' does not exist on type '{ message: string; }'.",
          source: 'glint:ts(2339)',
          range: new Range(12, 43, 12, 63),
        },
      ]);
    });

    test('rendering test', async () => {
      let scriptURI = Uri.file(`${rootDir}/tests/integration/component-test.js`);
      let scriptEditor = await window.showTextDocument(scriptURI);

      // Ensure everything is clean to start
      expect(languages.getDiagnostics(scriptURI)).toEqual([]);

      // Delete a character "message" in `{{this.message}}`
      await scriptEditor.edit((edit) => {
        edit.delete(new Range(11, 19, 11, 21));
      });

      // Wait for a diagnostic to appear
      await waitUntil(() => languages.getDiagnostics(scriptURI).length);

      expect(languages.getDiagnostics(scriptURI)).toMatchObject([
        {
          message: "Property 'messe' does not exist on type 'TestComponent'.",
          source: 'glint:ts(2339)',
          range: new Range(11, 15, 11, 20),
        },
      ]);
    });
  });
});
