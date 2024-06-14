import { Project } from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';
import typescript from 'typescript';
import semver from 'semver';
import { FileChangeType } from '@volar/language-server';

describe('Language Server: custom file extensions', () => {
  let project!: Project;

  beforeEach(async () => {
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('reporting diagnostics', async () => {
    let contents = 'let identifier: string = 123;';

    project.setGlintConfig({ environment: 'ember-template-imports' });
    project.write('index.gts', contents);

    let server = await project.startLanguageServer();

    expect(server.getDiagnostics(project.fileURI('index.gts'))).toMatchInlineSnapshot(`
      [
        {
          "code": 2322,
          "message": "Type 'number' is not assignable to type 'string'.",
          "range": {
            "end": {
              "character": 14,
              "line": 0,
            },
            "start": {
              "character": 4,
              "line": 0,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
      ]
    `);

    server.openFile(project.fileURI('index.gts'), contents);

    expect(server.getDiagnostics(project.fileURI('index.gts'))).toMatchInlineSnapshot(`
      [
        {
          "code": 2322,
          "message": "Type 'number' is not assignable to type 'string'.",
          "range": {
            "end": {
              "character": 14,
              "line": 0,
            },
            "start": {
              "character": 4,
              "line": 0,
            },
          },
          "severity": 1,
          "source": "glint",
          "tags": [],
        },
      ]
    `);

    server.updateFile(project.fileURI('index.gts'), contents.replace('123', '"hi"'));

    expect(server.getDiagnostics(project.fileURI('index.gts'))).toEqual([]);
  });

  test('providing hover info', async () => {
    let contents = 'let identifier = "hello";';

    project.setGlintConfig({ environment: 'ember-template-imports' });
    project.write('index.gts', contents);

    let server = await project.startLanguageServer();
    let hover = server.getHover(project.fileURI('index.gts'), { line: 0, character: 8 });

    expect(hover).toMatchInlineSnapshot(`
      {
        "contents": [
          {
            "language": "ts",
            "value": "let identifier: string",
          },
        ],
        "range": {
          "end": {
            "character": 14,
            "line": 0,
          },
          "start": {
            "character": 4,
            "line": 0,
          },
        },
      }
    `);

    project.write('index.gts', contents.replace('"hello"', '123'));
    server.watchedFileDidChange(project.fileURI('index.gts'));

    hover = server.getHover(project.fileURI('index.gts'), { line: 0, character: 8 });

    expect(hover).toMatchInlineSnapshot(`
      {
        "contents": [
          {
            "language": "ts",
            "value": "let identifier: number",
          },
        ],
        "range": {
          "end": {
            "character": 14,
            "line": 0,
          },
          "start": {
            "character": 4,
            "line": 0,
          },
        },
      }
    `);
  });

  test('resolving conflicts between overlapping extensions', async () => {
    let contents = 'export let identifier = 123`;';

    project.setGlintConfig({ environment: 'ember-template-imports' });
    project.write('index.ts', contents);
    project.write('index.gts', contents);

    project.write(
      'consumer.ts',
      stripIndent`
        import { identifier } from './index';

        identifier;
      `
    );

    let consumerURI = project.fileURI('consumer.ts');
    let server = await project.startLanguageServer();

    let definitions = await server.sendDefinitionRequest(consumerURI, { line: 2, character: 4 });

    const tsPath = project.filePath('consumer.ts');
    const { uri } = await server.openTextDocument(tsPath, 'typescript');
    let diagnostics = await server.sendDocumentDiagnosticRequestNormalized(uri);

    expect(definitions).toMatchObject([{ targetUri: project.fileURI('index.ts') }]);
    expect(diagnostics).toEqual([]);

    project.remove('index.ts');
    await server.didChangeWatchedFiles([
      { uri: project.fileURI('index.ts'), type: FileChangeType.Deleted },
    ]);

    definitions = await server.sendDefinitionRequest(consumerURI, { line: 2, character: 4 });
    diagnostics = await server.sendDocumentDiagnosticRequestNormalized(uri);

    expect(definitions).toMatchObject([{ targetUri: project.fileURI('index.gts') }]);
    expect(diagnostics).toEqual([]);

    project.remove('index.gts');
    await server.didChangeWatchedFiles([
      { uri: project.fileURI('index.gts'), type: FileChangeType.Deleted },
    ]);

    diagnostics = await server.sendDocumentDiagnosticRequestNormalized(uri);

    expect(diagnostics).toMatchObject([
      {
        source: 'glint',
        code: 2307,
        range: {
          start: { line: 0, character: 27 },
          end: { line: 0, character: 36 },
        },
      },
    ]);
  });

  describe('external file changes', () => {
    beforeEach(() => {
      project.setGlintConfig({ environment: 'ember-template-imports' });
      project.write(
        'index.gts',
        stripIndent`
          import { foo } from "./other";
          console.log(foo);
        `
      );
    });

    test('adding a missing module', async () => {
      let server = await project.startLanguageServer();

      const tsPath = project.filePath('index.gts');
      const { uri } = await server.openTextDocument(tsPath, 'glimmer-ts');
      let diagnostics = await server.sendDocumentDiagnosticRequestNormalized(uri);

      expect(diagnostics).toMatchObject([
        {
          message: "Cannot find module './other' or its corresponding type declarations.",
          source: 'glint',
          code: 2307,
        },
      ]);

      project.write('other.gjs', 'export const foo = 123;');

      await server.didChangeWatchedFiles([
        { uri: project.fileURI('other.gjs'), type: FileChangeType.Created },
      ]);

      diagnostics = await server.sendDocumentDiagnosticRequestNormalized(
        project.fileURI('index.gts')
      );

      expect(diagnostics).toEqual([]);
    });

    test.only('changing an imported module', async () => {
      project.write('other.gjs', 'export const foo = 123;');

      let server = await project.startLanguageServer();
      await server.openTextDocument(project.filePath('index.gts'), 'glimmer-ts');
      let info = await server.sendHoverRequest(project.fileURI('index.gts'), {
        line: 0,
        character: 10,
      });
      expect(info?.contents).toEqual({
        kind: 'markdown',
        value: '```typescript\n(alias) const foo: 123\nimport foo\n```',
      });

      project.write('other.gjs', 'export const foo = "hi";');

      await server.didChangeWatchedFiles([
        { uri: project.fileURI('other.gjs'), type: FileChangeType.Changed },
      ]);

      info = await server.sendHoverRequest(project.fileURI('index.gts'), {
        line: 0,
        character: 10,
      });

      expect(info?.contents).toEqual({
        kind: 'markdown',
        value: '```typescript\n(alias) const foo: "hi"\nimport foo\n```',
      });
    });

    test('removing an imported module', async () => {
      project.write('other.gjs', 'export const foo = 123;');

      let server = await project.startLanguageServer();
      let diagnostics = server.getDiagnostics(project.fileURI('index.gts'));

      expect(diagnostics).toEqual([]);

      project.remove('other.gjs');
      server.watchedFileWasRemoved(project.fileURI('other.gjs'));

      diagnostics = server.getDiagnostics(project.fileURI('index.gts'));

      expect(diagnostics).toMatchObject([
        {
          message: "Cannot find module './other' or its corresponding type declarations.",
          source: 'ts',
          code: 2307,
        },
      ]);
    });
  });

  describe('module resolution with explicit extensions', () => {
    beforeEach(() => {
      project.setGlintConfig({ environment: 'ember-template-imports' });
      project.write({
        'index.gts': stripIndent`
          import Greeting from './Greeting.gts';
          <template><Greeting /></template>
        `,
        'Greeting.gts': stripIndent`
          <template>Hello!</template>
        `,
      });
    });

    test('is illegal by default', async () => {
      let server = await project.startLanguageServer();

      expect(server.getDiagnostics(project.fileURI('index.gts'))).toMatchInlineSnapshot(`
        [
          {
            "code": 2307,
            "message": "Cannot find module './Greeting.gts' or its corresponding type declarations.",
            "range": {
              "end": {
                "character": 37,
                "line": 0,
              },
              "start": {
                "character": 21,
                "line": 0,
              },
            },
            "severity": 1,
            "source": "glint",
            "tags": [],
          },
        ]
      `);
    });

    test.runIf(semver.gte(typescript.version, '5.0.0'))(
      'works with `allowImportingTsExtensions: true`',
      async () => {
        project.updateTsconfig((config) => {
          config.compilerOptions ??= {};
          config.compilerOptions['allowImportingTsExtensions'] = true;
        });

        let server = await project.startLanguageServer();

        expect(server.getDiagnostics(project.fileURI('index.gts'))).toEqual([]);
      }
    );
  });
});
