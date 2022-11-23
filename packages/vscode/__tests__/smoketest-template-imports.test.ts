import { commands, languages, ViewColumn, window, Uri, Range } from 'vscode';
import * as path from 'path';
import { waitUntil } from './helpers/async';

describe('Smoke test: ETI Environment', () => {
  jest.setTimeout(30_000);

  const rootDir = path.resolve(__dirname, '../__fixtures__/template-imports-app');

  afterEach(async () => {
    while (window.activeTextEditor) {
      await commands.executeCommand('workbench.action.files.revert');
      await commands.executeCommand('workbench.action.closeActiveEditor');
    }
  });

  describe('diagnostics for errors', () => {
    test('with a custom extension', async () => {
      let scriptURI = Uri.file(`${rootDir}/src/index.gts`);
      let scriptEditor = await window.showTextDocument(scriptURI, { viewColumn: ViewColumn.One });

      // Ensure we have a clean bill of health
      expect(languages.getDiagnostics(scriptURI)).toEqual([]);

      // Replace a string with a number
      await scriptEditor.edit((edit) => {
        edit.replace(new Range(6, 20, 6, 27), '{{123}}');
      });

      // Wait for the diagnostic to show up
      await waitUntil(() => languages.getDiagnostics(scriptURI).length);

      // Verify it's what we expect
      expect(languages.getDiagnostics(scriptURI)).toMatchObject([
        {
          message: "Type 'number' is not assignable to type 'string'.",
          source: 'glint:ts(2322)',
          range: new Range(6, 13, 6, 19),
        },
      ]);
    });

    describe('debugging commands', () => {
      test('showing IR in a custom file type', async () => {
        let scriptURI = Uri.file(`${rootDir}/src/Greeting.gts`);
        let editor = await window.showTextDocument(scriptURI, { viewColumn: ViewColumn.One });

        await commands.executeCommand('glint.show-debug-ir');
        await waitUntil(() => editor.document.getText().includes('𝚪'));

        expect(editor.document.getText()).toMatch('𝚪.this.message');
      });
    });
  });
});
