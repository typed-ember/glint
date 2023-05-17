import {
  commands,
  languages,
  ViewColumn,
  window,
  Uri,
  Range,
  Position,
  CodeAction,
  workspace,
} from 'vscode';
import * as path from 'path';
import { describe, afterEach, test } from 'mocha';
import { expect } from 'expect';
import { waitUntil } from './helpers/async';

describe('Smoke test: ETI Environment', () => {
  const rootDir = path.resolve(__dirname, '../../__fixtures__/template-imports-app');

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
          source: 'glint',
          code: 2322,
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

    describe('codeactions args', () => {
      test('adds missing args from template into Args type', async () => {
        let scriptURI = Uri.file(`${rootDir}/src/Greeting.gts`);

        // Open the script and the template
        let scriptEditor = await window.showTextDocument(scriptURI, { viewColumn: ViewColumn.One });

        // Ensure neither has any diagnostic messages
        expect(languages.getDiagnostics(scriptURI)).toEqual([]);

        // Comment out a property in the script that's referenced in the template
        await scriptEditor.edit((edit) => {
          edit.insert(new Position(10, 4), '{{@undocumentedProperty}} ');
        });

        // Wait for a diagnostic to appear in the template
        await waitUntil(() => languages.getDiagnostics(scriptURI).length);

        const fixes = await commands.executeCommand<CodeAction[]>(
          'vscode.executeCodeActionProvider',
          scriptURI,
          new Range(new Position(10, 9), new Position(10, 9))
        );

        expect(fixes.length).toBe(3);

        expect(fixes[1].title).toBe(`Declare property 'undocumentedProperty'`);

        // apply the missing arg fix
        await workspace.applyEdit(fixes![1].edit!);

        await waitUntil(
          () =>
            scriptEditor.document.getText().includes('undocumentedProperty: any') &&
            languages.getDiagnostics(scriptURI).length === 0
        );
      });
    });

    describe('codeactions locals', () => {
      test('add local props to a class', async () => {
        let scriptURI = Uri.file(`${rootDir}/src/Greeting.gts`);

        // Open the script and the template
        let scriptEditor = await window.showTextDocument(scriptURI, { viewColumn: ViewColumn.One });

        // Ensure neither has any diagnostic messages
        expect(languages.getDiagnostics(scriptURI)).toEqual([]);

        await scriptEditor.edit((edit) => {
          edit.insert(new Position(10, 4), '{{this.localProp}} ');
        });

        // Wait for a diagnostic to appear in the template
        await waitUntil(() => languages.getDiagnostics(scriptURI).length);

        const fixes = await commands.executeCommand<CodeAction[]>(
          'vscode.executeCodeActionProvider',
          scriptURI,
          new Range(new Position(10, 12), new Position(10, 12))
        );

        expect(fixes.length).toBe(3);

        expect(fixes[1].title).toBe(`Declare property 'localProp'`);

        // select ignore
        await workspace.applyEdit(fixes![0].edit!);

        await waitUntil(
          () =>
            scriptEditor.document.getText().includes('localProp: any') &&
            languages.getDiagnostics(scriptURI).length
        );
      });
    });
  });
});
