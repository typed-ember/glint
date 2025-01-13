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
import { waitUntil } from '../helpers/async';

describe('Smoke test: ETI Environment (TS Plugin Mode)', () => {
  const rootDir = path.resolve(__dirname, '../../../__fixtures__/template-imports-app-ts-plugin');

  afterEach(async () => {
    while (window.activeTextEditor) {
      await commands.executeCommand('workbench.action.files.revert');
      await commands.executeCommand('workbench.action.closeActiveEditor');
    }
  });

  describe('diagnostics for errors', () => {
    // TODO: fix remaining tests and remove this `.only`
    test.only('with a custom extension', async () => {
      let scriptURI = Uri.file(`${rootDir}/src/index.gts`);
      let scriptEditor = await window.showTextDocument(scriptURI, { viewColumn: ViewColumn.One });

      // Ensure we have a clean bill of health
      expect(languages.getDiagnostics(scriptURI)).toEqual([]);

      await hackishlyWaitForTypescriptPluginToActivate();

      // Replace a string with a number
      await scriptEditor.edit((edit) => {
        edit.replace(new Range(10, 20, 10, 27), '{{123}}');

        // Original range, in case we revert some of the TS-Plugin-specific
        // edit.replace(new Range(6, 20, 6, 27), '{{123}}');
      });

      // Wait for the diagnostic to show up
      await waitUntil(() => languages.getDiagnostics(scriptURI).length);

      // Verify it's what we expect
      expect(languages.getDiagnostics(scriptURI)).toMatchObject([
        {
          message: "Type 'number' is not assignable to type 'string'.",
          source: 'ts-plugin',
          code: 2322,
          // range: new Range(6, 13, 6, 19),
          range: new Range(10, 13, 10, 19),
        },
      ]);
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
          new Range(new Position(10, 9), new Position(10, 9)),
        );

        expect(fixes.length).toBe(4);

        const fix = fixes.find((fix) => fix.title === "Declare property 'undocumentedProperty'");

        expect(fix).toBeDefined();

        // apply the missing arg fix
        await workspace.applyEdit(fix!.edit!);

        await waitUntil(
          () =>
            scriptEditor.document.getText().includes('undocumentedProperty: any') &&
            languages.getDiagnostics(scriptURI).length === 0,
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
          new Range(new Position(10, 12), new Position(10, 12)),
        );

        expect(fixes.length).toBe(4);

        const fix = fixes.find((fix) => fix.title === "Declare property 'localProp'");

        expect(fix).toBeDefined();

        // select ignore
        await workspace.applyEdit(fix!.edit!);

        await waitUntil(
          () =>
            scriptEditor.document.getText().includes('localProp: any') &&
            languages.getDiagnostics(scriptURI).length,
        );
      });
    });
  });
});

/**
 * We shouldn't have to use this function for many reasons:
 *
 * 1. Using timers to avoid a race condition is brittle
 * 2. More importantly: this only solves the problem of "make sure the TS Plugin is activated
 *    before we edit the file" when what we REALLY want is diagnostics to kick in without
 *    editing.
 */
function hackishlyWaitForTypescriptPluginToActivate() {
  return new Promise((resolve) => setTimeout(resolve, 5000));
}
