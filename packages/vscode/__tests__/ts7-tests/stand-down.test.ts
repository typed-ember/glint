import { commands, extensions, languages, Range, Uri, ViewColumn, window } from 'vscode';
import type { Diagnostic } from 'vscode';
import * as fs from 'fs';
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

  test('serves .gts through the tsdk the workspace points at', async () => {
    const api = extensions.getExtension(GLINT_EXTENSION_ID)!.exports as {
      typescript7: { version: Promise<string | undefined>; mode: Promise<string> };
    };
    const tsdkManifest = JSON.parse(
      fs.readFileSync(`${rootDir}/node_modules/typescript/package.json`, 'utf8'),
    ) as { version: string };

    expect(await api.typescript7.version).toBe(tsdkManifest.version);
    expect(await api.typescript7.mode).toBe('client');
  });

  test('the TypeScript 7 extension runs its server for .ts files', async () => {
    await window.showTextDocument(Uri.file(`${rootDir}/app/utils/format.ts`));

    const host = extensions.all.find(
      (extension) =>
        typeof (extension.packageJSON as { main?: unknown }).main === 'string' &&
        typeof (extension.packageJSON as { bundledTypeScriptVersion?: unknown })
          .bundledTypeScriptVersion === 'string',
    );
    expect(host).toBeDefined();
    const api = (await host!.activate()) as {
      initializeAPIConnection?: () => Promise<string>;
    };
    // Rejects with "Language server is not running." when it did not start.
    await waitUntil(
      () =>
        api.initializeAPIConnection?.().then(
          () => true,
          () => false,
        ),
      'TypeScript 7 server running',
    );
  });

  test('the native server checks .gts templates and .ts files alike', async () => {
    const gtsUri = Uri.file(`${rootDir}/app/components/greeting.gts`);
    const gtsEditor = await window.showTextDocument(gtsUri, { viewColumn: ViewColumn.One });

    // `shout` takes a string; hand it a number inside the template.
    const call = gtsEditor.document.getText().indexOf('{{shout @name}}');
    expect(call).toBeGreaterThan(-1);
    const argument = gtsEditor.document.positionAt(call + '{{shout '.length);
    await gtsEditor.edit((edit) => {
      edit.replace(new Range(argument, argument.translate(0, '@name'.length)), '123');
    });
    const gtsDiagnostic = await waitForDiagnostic(gtsUri, 2345);
    expect(gtsDiagnostic.message).toBe(
      "Argument of type 'number' is not assignable to parameter of type 'string'.",
    );
    expect(gtsDiagnostic.range).toEqual(new Range(argument, argument.translate(0, 3)));
    // One server, one report: a duplicate here means two clients serve the file.
    expect(languages.getDiagnostics(gtsUri).filter((d) => d.code === 2345)).toHaveLength(1);

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
  await waitUntil(
    find,
    () =>
      `diagnostic ${code} for ${path.basename(uri.fsPath)}; saw ${JSON.stringify(
        languages.getDiagnostics(uri).map((diagnostic) => ({
          code: diagnostic.code,
          source: diagnostic.source,
          message: diagnostic.message,
        })),
      )}`,
  );
  return find()!;
}
