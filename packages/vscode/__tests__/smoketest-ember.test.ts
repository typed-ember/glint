import {
  commands,
  languages,
  Position,
  ViewColumn,
  window,
  Uri,
  Range,
  extensions,
  Location,
} from 'vscode';
import path from 'path';
import { waitUntil } from './helpers/async';

describe('Smoke test: Ember', () => {
  jest.setTimeout(30_000);

  const rootDir = path.resolve(__dirname, '../__fixtures__/ember-app');

  afterEach(async () => {
    while (window.activeTextEditor) {
      await commands.executeCommand('workbench.action.files.revert');
      await commands.executeCommand('workbench.action.closeActiveEditor');
    }
  });

  test('introducing an error', async () => {
    let scriptURI = Uri.file(`${rootDir}/app/components/colocated-layout.ts`);
    let templateURI = Uri.file(`${rootDir}/app/components/colocated-layout.hbs`);

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
        message: "Property 'message' does not exist on type 'ColocatedLayoutComponent'.",
        source: 'glint:ts(2339)',
        range: new Range(0, 7, 0, 14),
      },
    ]);
  });

  describe('component layout', () => {
    test('classic', async () => {
      let scriptURI = Uri.file(`${rootDir}/app/components/classic-layout.ts`);
      let templateURI = Uri.file(`${rootDir}/app/templates/components/classic-layout.hbs`);

      await window.showTextDocument(templateURI);

      await waitUntil(() => extensions.getExtension('typed-ember.glint-vscode')?.isActive);

      let positions = (await commands.executeCommand(
        'vscode.executeDefinitionProvider',
        templateURI,
        new Position(0, 11)
      )) as Array<Location>;

      expect(positions.length).toBe(1);
      expect(positions[0].uri.fsPath).toEqual(scriptURI.fsPath);
      expect(positions[0].range).toEqual(new Range(3, 10, 3, 17));
    });

    test('colocated', async () => {
      let scriptURI = Uri.file(`${rootDir}/app/components/colocated-layout.ts`);
      let templateURI = Uri.file(`${rootDir}/app/components/colocated-layout.hbs`);

      await window.showTextDocument(templateURI);

      await waitUntil(() => extensions.getExtension('typed-ember.glint-vscode')?.isActive);

      let positions = (await commands.executeCommand(
        'vscode.executeDefinitionProvider',
        templateURI,
        new Position(0, 11)
      )) as Array<Location>;

      expect(positions.length).toBe(1);
      expect(positions[0].uri.fsPath).toEqual(scriptURI.fsPath);
      expect(positions[0].range).toEqual(new Range(3, 10, 3, 17));
    });

    test('pod', async () => {
      let scriptURI = Uri.file(`${rootDir}/app/components/pod-layout/component.ts`);
      let templateURI = Uri.file(`${rootDir}/app/components/pod-layout/template.hbs`);

      await window.showTextDocument(templateURI);

      await waitUntil(() => extensions.getExtension('typed-ember.glint-vscode')?.isActive);

      let positions = (await commands.executeCommand(
        'vscode.executeDefinitionProvider',
        templateURI,
        new Position(0, 11)
      )) as Array<Location>;

      expect(positions.length).toBe(1);
      expect(positions[0].uri.fsPath).toEqual(scriptURI.fsPath);
      expect(positions[0].range).toEqual(new Range(3, 10, 3, 17));
    });
  });

  describe('route/controller layout', () => {
    test('classic route-only', async () => {
      let scriptURI = Uri.file(`${rootDir}/app/routes/classic-lone-route.ts`);
      let templateURI = Uri.file(`${rootDir}/app/templates/classic-lone-route.hbs`);

      await window.showTextDocument(templateURI);

      await waitUntil(() => extensions.getExtension('typed-ember.glint-vscode')?.isActive);

      let positions = (await commands.executeCommand(
        'vscode.executeDefinitionProvider',
        templateURI,
        new Position(0, 12)
      )) as Array<Location>;

      expect(positions.length).toBe(1);
      expect(positions[0].uri.fsPath).toEqual(scriptURI.fsPath);
      expect(positions[0].range).toEqual(new Range(3, 27, 3, 34));
    });

    test('classic route + controller', async () => {
      let scriptURI = Uri.file(`${rootDir}/app/controllers/classic-controller-route.ts`);
      let templateURI = Uri.file(`${rootDir}/app/templates/classic-controller-route.hbs`);

      await window.showTextDocument(templateURI);

      await waitUntil(() => extensions.getExtension('typed-ember.glint-vscode')?.isActive);

      let positions = (await commands.executeCommand(
        'vscode.executeDefinitionProvider',
        templateURI,
        new Position(0, 12)
      )) as Array<Location>;

      expect(positions.length).toBe(1);
      expect(positions[0].uri.fsPath).toEqual(scriptURI.fsPath);
      expect(positions[0].range).toEqual(new Range(3, 19, 3, 26));
    });

    test('pods route-only', async () => {
      let scriptURI = Uri.file(`${rootDir}/app/pods/pod-lone-route/route.ts`);
      let templateURI = Uri.file(`${rootDir}/app/pods/pod-lone-route/template.hbs`);

      await window.showTextDocument(templateURI);

      await waitUntil(() => extensions.getExtension('typed-ember.glint-vscode')?.isActive);

      let positions = (await commands.executeCommand(
        'vscode.executeDefinitionProvider',
        templateURI,
        new Position(0, 12)
      )) as Array<Location>;

      expect(positions.length).toBe(1);
      expect(positions[0].uri.fsPath).toEqual(scriptURI.fsPath);
      expect(positions[0].range).toEqual(new Range(3, 27, 3, 34));
    });

    test('pods route + controller', async () => {
      let scriptURI = Uri.file(`${rootDir}/app/pods/pod-controller-route/controller.ts`);
      let templateURI = Uri.file(`${rootDir}/app/pods/pod-controller-route/template.hbs`);

      await window.showTextDocument(templateURI);

      await waitUntil(() => extensions.getExtension('typed-ember.glint-vscode')?.isActive);

      let positions = (await commands.executeCommand(
        'vscode.executeDefinitionProvider',
        templateURI,
        new Position(0, 12)
      )) as Array<Location>;

      expect(positions.length).toBe(1);
      expect(positions[0].uri.fsPath).toEqual(scriptURI.fsPath);
      expect(positions[0].range).toEqual(new Range(3, 19, 3, 26));
    });
  });
});
