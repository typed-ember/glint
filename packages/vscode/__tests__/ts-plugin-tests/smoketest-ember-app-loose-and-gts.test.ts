import { commands, languages, ViewColumn, window, Uri, Range } from 'vscode';
import * as path from 'path';
import { describe, afterEach, test } from 'mocha';
import { expect } from 'expect';
import { waitUntil } from '../helpers/async';

describe('Smoke test: Loose Mode + GTS with TS Plugin Mode', () => {
  const rootDir = path.resolve(__dirname, '../../../__fixtures__/ember-app-loose-and-gts');

  afterEach(async () => {
    while (window.activeTextEditor) {
      await commands.executeCommand('workbench.action.files.revert');
      await commands.executeCommand('workbench.action.closeActiveEditor');
    }
  });

  describe('loose mode aka ts + hbs two-file components', () => {
    describe('diagnostics', () => {
      test('reports errors and errors disappear when fixed', async () => {
        let tsScriptURI = Uri.file(`${rootDir}/app/components/colocated-layout-with-errors.ts`);

        // Open the backing TS component file. Currently this is required in order to activate the VSCode,
        // which is currently only configured to activate for .gts and .gjs files.
        await window.showTextDocument(tsScriptURI, {
          viewColumn: ViewColumn.One,
        });

        let hbsScriptURI = Uri.file(`${rootDir}/app/components/colocated-layout-with-errors.hbs`);

        // Open the script and the template
        let scriptEditor = await window.showTextDocument(hbsScriptURI, {
          viewColumn: ViewColumn.One,
        });

        // Wait for a diagnostic to appear in the template
        await waitUntil(
          () => languages.getDiagnostics(hbsScriptURI).length,
          'diagnostic to appear',
        );

        expect(languages.getDiagnostics(hbsScriptURI)).toMatchObject([
          {
            message:
              "Property 'messageeee' does not exist on type 'ColocatedLayoutComponent'. Did you mean 'message'?",
            source: 'ts-plugin',
            code: 2551,
          },
        ]);

        // Replace a string with a number
        await scriptEditor.edit((edit) => {
          edit.replace(new Range(4, 14, 4, 17), '');
        });

        // Wait for the diagnostic to disappear
        await waitUntil(
          () => languages.getDiagnostics(hbsScriptURI).length == 0,
          'diagnostic to disappear',
        );
      });
    });
  });
});
