import { Project } from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { Position, Range } from 'vscode-languageserver';

describe('Language Server: iInlays', () => {
  let project!: Project;

  beforeEach(async () => {
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('it provides inlays for return types when preference is set', async () => {
    project.setGlintConfig({ environment: 'ember-template-imports' });
    let content = 'const bar = () => true;';
    project.write('foo.gts', content);
    let server = project.startLanguageServer();

    const inlays = server.getInlayHints(
      {
        textDocument: {
          uri: project.fileURI('foo.gts'),
        },
        range: Range.create(Position.create(0, 0), Position.create(0, content.length)),
      },
      {
        includeInlayFunctionLikeReturnTypeHints: true,
      }
    );

    expect(inlays.length).toBe(1);
    expect(inlays[0].kind).toBe(1);
    expect(inlays[0].label).toBe(': boolean');
  });

  test('it provides inlays for variable types when preference is set', async () => {
    project.setGlintConfig({ environment: 'ember-template-imports' });
    let content = 'const bar = globalThis.thing ?? null;';
    project.write('foo.gts', content);
    let server = project.startLanguageServer();

    const inlays = server.getInlayHints(
      {
        textDocument: {
          uri: project.fileURI('foo.gts'),
        },
        range: Range.create(Position.create(0, 0), Position.create(0, content.length)),
      },
      {
        includeInlayVariableTypeHints: true,
      }
    );

    expect(inlays.length).toBe(1);
    expect(inlays[0].kind).toBe(1);
    expect(inlays[0].label).toBe(': any');
  });

  test('it provides inlays for property types when preference is set', async () => {
    project.setGlintConfig({ environment: 'ember-template-imports' });
    let content = 'class Foo { date = Date.now() }';
    project.write('foo.gts', content);
    let server = project.startLanguageServer();

    const inlays = server.getInlayHints(
      {
        textDocument: {
          uri: project.fileURI('foo.gts'),
        },
        range: Range.create(Position.create(0, 0), Position.create(0, content.length)),
      },
      {
        includeInlayPropertyDeclarationTypeHints: true,
      }
    );

    expect(inlays.length).toBe(1);
    expect(inlays[0].kind).toBe(1);
    expect(inlays[0].label).toBe(': number');
  });
});
