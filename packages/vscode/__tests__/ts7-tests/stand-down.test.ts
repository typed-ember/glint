import { commands, extensions, languages, Range, Uri, ViewColumn, window } from 'vscode';
import type { Diagnostic } from 'vscode';
import * as path from 'path';
import { describe, afterEach, before, test } from 'mocha';
import { expect } from 'expect';
import { waitUntil } from '../helpers/async';

const GLINT_EXTENSION_ID = 'typed-ember.glint2-vscode';

describe('TypeScript 7 stand-down (content mapper mode)', () => {
  const rootDir = path.resolve(__dirname, '../../../../../test-packages/ts7-content-mapper-app');

  before(async () => {
    await window.showTextDocument(Uri.file(`${rootDir}/app/components/greeting.gts`));
    await waitUntil(() => extensions.getExtension(GLINT_EXTENSION_ID)?.isActive, 'Glint activated');
  });

  afterEach(async () => {
    while (window.activeTextEditor) {
      await commands.executeCommand('workbench.action.files.revert');
      await commands.executeCommand('workbench.action.closeActiveEditor');
    }
  });

  test('registers its menu command and none of the language server commands', async () => {
    const registered = await commands.getCommands(true);
    expect(registered).toContain('glint2.typescript7.showMenu');
    expect(registered).not.toContain('glint2.restart-language-server');
  });

  test('the native server checks .gts templates and .ts files alike', async () => {
    const gtsUri = Uri.file(`${rootDir}/app/components/greeting.gts`);
    const gtsEditor = await window.showTextDocument(gtsUri, { viewColumn: ViewColumn.One });

    // `shout` takes a string; hand it a number inside the template.
    await gtsEditor.edit((edit) => {
      edit.replace(new Range(16, 12, 16, 17), '123');
    });
    const gtsDiagnostic = await waitForDiagnostic(gtsUri, 2345);
    expect(gtsDiagnostic.message).toBe(
      "Argument of type 'number' is not assignable to parameter of type 'string'.",
    );
    expect(gtsDiagnostic.range).toEqual(new Range(16, 12, 16, 15));

    const tsUri = Uri.file(`${rootDir}/app/utils/format.ts`);
    const tsEditor = await window.showTextDocument(tsUri, { viewColumn: ViewColumn.One });
    await tsEditor.edit((edit) => {
      edit.insert(tsEditor.document.positionAt(0), 'const n: number = "x";\n');
    });
    const tsDiagnostic = await waitForDiagnostic(tsUri, 2322);

    // Both diagnostics must come from the same server, and never from Glint.
    expect(gtsDiagnostic.source).toBe(tsDiagnostic.source);
    expect(['glint', 'ts-plugin']).not.toContain(gtsDiagnostic.source);
  });
});

async function waitForDiagnostic(uri: Uri, code: number): Promise<Diagnostic> {
  const find = (): Diagnostic | undefined =>
    languages.getDiagnostics(uri).find((diagnostic) => diagnostic.code === code);
  await waitUntil(find, `diagnostic ${code} for ${path.basename(uri.fsPath)}`);
  return find()!;
}
