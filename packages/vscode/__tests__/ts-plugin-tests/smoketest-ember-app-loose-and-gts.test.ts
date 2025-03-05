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
  TextEditor,
} from 'vscode';
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

  describe.only('loose mode aka ts + hbs two-file components', () => {
    describe('diagnostics', () => {
      test('adds missing args from template into Args type', async () => {
        let scriptURI = Uri.file(`${rootDir}/app/components/Greeting.gts`);

        // Open the script and the template
        let scriptEditor = await window.showTextDocument(scriptURI, { viewColumn: ViewColumn.One });

        await hackishlyWaitForTypescriptPluginToActivate(scriptEditor, scriptURI);

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

        expect(fixes.length).toBe(5);

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

    // describe('diagnostics', () => {
    //   test('adds missing args from template into Args type', async () => {
    //     let scriptURI = Uri.file(`${rootDir}/app/components/Greeting.gts`);

    //     // Open the script and the template
    //     let scriptEditor = await window.showTextDocument(scriptURI, { viewColumn: ViewColumn.One });

    //     await hackishlyWaitForTypescriptPluginToActivate(scriptEditor, scriptURI);

    //     // Comment out a property in the script that's referenced in the template
    //     await scriptEditor.edit((edit) => {
    //       edit.insert(new Position(10, 4), '{{@undocumentedProperty}} ');
    //     });

    //     // Wait for a diagnostic to appear in the template
    //     await waitUntil(() => languages.getDiagnostics(scriptURI).length);

    //     const fixes = await commands.executeCommand<CodeAction[]>(
    //       'vscode.executeCodeActionProvider',
    //       scriptURI,
    //       new Range(new Position(10, 9), new Position(10, 9)),
    //     );

    //     expect(fixes.length).toBe(5);

    //     const fix = fixes.find((fix) => fix.title === "Declare property 'undocumentedProperty'");

    //     expect(fix).toBeDefined();

    //     // apply the missing arg fix
    //     await workspace.applyEdit(fix!.edit!);

    //     await waitUntil(
    //       () =>
    //         scriptEditor.document.getText().includes('undocumentedProperty: any') &&
    //         languages.getDiagnostics(scriptURI).length === 0,
    //     );
    //   });
    // });
  });
});

/**
 * It takes a little while for the TS Plugin to fully activate, and unfortunately
 * VSCode won't automatically re-trigger/re-calculate diagnostics for a file after
 * a TS Plugin kicks in, so we need some way to know that the TS Plugin is activated
 * before we edit the file.
 *
 * To accomplish this, this function inserts invalid TS into the .gts file and waits
 * for diagnostics to show up.
 */
async function hackishlyWaitForTypescriptPluginToActivate(
  scriptEditor: TextEditor,
  scriptURI: Uri,
): Promise<void> {
  let invalidAssignment = 'let s: string = 123;';
  await scriptEditor.edit((edit) => {
    edit.insert(new Position(0, 0), invalidAssignment);
  });

  let numSpacesAdded = 0;
  const startTime = Date.now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    await scriptEditor.edit((edit) => {
      edit.insert(new Position(0, 0), ' ');
    });
    numSpacesAdded++;

    if (languages.getDiagnostics(scriptURI).length) {
      break;
    }

    if (Date.now() - startTime > 5000) {
      throw new Error(
        'Timed out waiting for TS Plugin to activate (i.e. waiting for diagnostics to show up)',
      );
    }

    // We'd love to wait for a smaller increment than 1000 but the editor
    // debounces before triggering diagnostics so we need a large enough time.
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Remove our invalid assignment
  await scriptEditor.edit((edit) => {
    edit.replace(new Range(0, 0, 0, invalidAssignment.length + numSpacesAdded), '');
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (languages.getDiagnostics(scriptURI).length) {
    throw new Error('Diagnostics still showing up after removing invalid assignment');
  }
}
