import {
  commands,
  languages,
  Position,
  ViewColumn,
  window,
  Uri,
  Range,
  CodeAction,
  workspace,
} from 'vscode';
import * as path from 'path';
import { describe, afterEach, test } from 'mocha';
import { expect } from 'expect';
import { waitUntil } from './helpers/async';

describe('Smoke test: js-glimmerx', () => {
  const rootDir = path.resolve(__dirname, '../../__fixtures__/js-glimmerx-app');

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
        edit.insert(new Position(11, 27), ' {{@undocumentedProperty}}');
      });

      // Wait for a diagnostic to appear in the template
      await waitUntil(() => languages.getDiagnostics(scriptURI).length);

      // Ensure the diagnostic is the error we expect
      expect(languages.getDiagnostics(scriptURI)).toMatchObject([
        {
          message: "Property 'undocumentedProperty' does not exist on type '{ message: string; }'.",
          source: 'glint',
          code: 2339,
          range: new Range(11, 31, 11, 51),
        },
      ]);
    });

    test('rendering test', async () => {
      let scriptURI = Uri.file(`${rootDir}/tests/integration/component-test.js`);
      let scriptEditor = await window.showTextDocument(scriptURI);

      // Ensure everything is clean to start
      expect(languages.getDiagnostics(scriptURI)).toEqual([]);

      // Replace "message" in `{{this.message}}` with "foo"
      await scriptEditor.edit((edit) => {
        edit.replace(new Range(10, 15, 10, 22), 'foo');
      });

      // Wait for a diagnostic to appear
      await waitUntil(() => languages.getDiagnostics(scriptURI).length);

      expect(languages.getDiagnostics(scriptURI)).toMatchObject([
        {
          message: "Property 'foo' does not exist on type 'TestComponent'.",
          source: 'glint',
          code: 2339,
          range: new Range(10, 15, 10, 18),
        },
      ]);
    });

    test('glint-ignore codeaction in JS files', async () => {
      let scriptURI = Uri.file(`${rootDir}/src/SimpleComponent.js`);

      // Open the script and the template
      let scriptEditor = await window.showTextDocument(scriptURI, { viewColumn: ViewColumn.One });

      // Ensure neither has any diagnostic messages
      expect(languages.getDiagnostics(scriptURI)).toEqual([]);

      // Comment out a property in the script that's referenced in the template
      await scriptEditor.edit((edit) => {
        edit.insert(new Position(11, 27), ' {{@undocumentedProperty}}');
      });

      // Wait for a diagnostic to appear in the template
      await waitUntil(() => {
        const diagnostics = languages.getDiagnostics(scriptURI);
        return diagnostics.length;
      });

      const fixes = await commands.executeCommand<CodeAction[]>(
        'vscode.executeCodeActionProvider',
        scriptURI,
        new Range(new Position(11, 32), new Position(11, 32))
      );

      // select ignore
      await workspace.applyEdit(fixes![0].edit!);

      await waitUntil(() => scriptEditor.document.getText().includes('glint-ignore'));
    });
  });
});
