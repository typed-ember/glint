import { Project } from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';
import typescript from 'typescript';
import semver from 'semver';
import { FileChangeType, Position, Range, TextEdit } from '@volar/language-server';

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

    const { uri } = await server.openTextDocument(project.filePath('index.gts'), 'glimmer-ts');
    let diagnostics = await server.sendDocumentDiagnosticRequest(uri);

    expect(diagnostics.items).toMatchInlineSnapshot(`
      [
        {
          "code": 2322,
          "data": {
            "documentUri": "volar-embedded-content://URI_ENCODED_PATH_TO/FILE",
            "isFormat": false,
            "original": {},
            "pluginIndex": 0,
            "uri": "file:///path/to/EPHEMERAL_TEST_PROJECT/index.gts",
            "version": 0,
          },
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
        },
      ]
    `);
  });

  test('providing hover info', async () => {
    let contents = 'let identifier = "hello";';

    project.setGlintConfig({ environment: 'ember-template-imports' });
    project.write('index.gts', contents);

    let server = await project.startLanguageServer();

    await server.openTextDocument(project.filePath('index.gts'), 'glimmer-ts');
    let hover = await server.sendHoverRequest(project.fileURI('index.gts'), {
      line: 0,
      character: 8,
    });

    expect(hover).toMatchInlineSnapshot(`
      {
        "contents": {
          "kind": "markdown",
          "value": "\`\`\`typescript
      let identifier: string
      \`\`\`",
        },
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

    await server.replaceTextDocument(
      project.fileURI('index.gts'),
      contents.replace('"hello"', '123'),
    );

    hover = await server.sendHoverRequest(project.fileURI('index.gts'), {
      line: 0,
      character: 8,
    });

    expect(hover).toMatchInlineSnapshot(`
      {
        "contents": {
          "kind": "markdown",
          "value": "\`\`\`typescript
      let identifier: number
      \`\`\`",
        },
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
      `,
    );

    let consumerURI = project.fileURI('consumer.ts');
    let server = await project.startLanguageServer();

    let definitions = await server.sendDefinitionRequest(consumerURI, { line: 2, character: 4 });

    const tsPath = project.filePath('consumer.ts');
    const { uri } = await server.openTextDocument(tsPath, 'typescript');
    let diagnostics = await server.sendDocumentDiagnosticRequest(uri);

    expect(definitions).toMatchObject([
      { targetUri: 'file:///path/to/EPHEMERAL_TEST_PROJECT/index.ts' },
    ]);
    expect(diagnostics.items).toEqual([]);

    project.remove('index.ts');
    await server.didChangeWatchedFiles([
      { uri: project.fileURI('index.ts'), type: FileChangeType.Deleted },
    ]);

    definitions = await server.sendDefinitionRequest(consumerURI, { line: 2, character: 4 });
    diagnostics = await server.sendDocumentDiagnosticRequest(uri);

    expect(definitions).toMatchObject([
      { targetUri: 'file:///path/to/EPHEMERAL_TEST_PROJECT/index.gts' },
    ]);
    expect(diagnostics.items).toEqual([]);

    project.remove('index.gts');
    await server.didChangeWatchedFiles([
      { uri: project.fileURI('index.gts'), type: FileChangeType.Deleted },
    ]);

    diagnostics = await server.sendDocumentDiagnosticRequest(uri);

    expect(diagnostics.items).toMatchObject([
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
        `,
      );
    });

    test('adding a missing module', async () => {
      let server = await project.startLanguageServer();

      const tsPath = project.filePath('index.gts');
      const { uri } = await server.openTextDocument(tsPath, 'glimmer-ts');
      let diagnostics = await server.sendDocumentDiagnosticRequest(uri);

      expect(diagnostics.items).toMatchObject([
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

      diagnostics = await server.sendDocumentDiagnosticRequest(project.fileURI('index.gts'));

      expect(diagnostics.items).toEqual([]);
    });

    test('changing an imported module', async () => {
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

      const { uri } = await server.openTextDocument(project.filePath('index.gts'), 'glimmer-ts');

      let diagnostics = await server.sendDocumentDiagnosticRequest(uri);
      expect(diagnostics.items).toEqual([]);

      project.remove('other.gjs');
      await server.didChangeWatchedFiles([
        { uri: project.fileURI('other.gjs'), type: FileChangeType.Deleted },
      ]);

      diagnostics = await server.sendDocumentDiagnosticRequest(uri);

      expect(diagnostics.items).toMatchObject([
        {
          message: "Cannot find module './other' or its corresponding type declarations.",
          source: 'glint',
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

    test('works with `allowImportingTsExtensions: true`', async () => {
      project.updateTsconfig((config) => {
        config.compilerOptions ??= {};
        config.compilerOptions['allowImportingTsExtensions'] = true;
      });

      let server = await project.startLanguageServer();

      const { uri } = await server.openTextDocument(project.filePath('index.gts'), 'glimmer-ts');
      let diagnostics = (await server.sendDocumentDiagnosticRequest(uri)) as any;

      expect(diagnostics.items).toEqual([]);
    });
  });
});
