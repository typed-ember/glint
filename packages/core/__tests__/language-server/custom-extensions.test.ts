import Project from '../utils/project';
import { stripIndent } from 'common-tags';

describe('Language Server: custom file extensions', () => {
  let project!: Project;

  beforeEach(async () => {
    jest.setTimeout(20_000);
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('reporting diagnostics', () => {
    let contents = 'let identifier: string = 123;';

    project.write('.glintrc', `environment: custom-test`);
    project.write('index.custom', contents);

    let server = project.startLanguageServer();

    expect(server.getDiagnostics(project.fileURI('index.custom'))).toMatchInlineSnapshot(`
      Array [
        Object {
          "message": "Type 'number' is not assignable to type 'string'.",
          "range": Object {
            "end": Object {
              "character": 14,
              "line": 0,
            },
            "start": Object {
              "character": 4,
              "line": 0,
            },
          },
          "severity": 1,
          "source": "glint:ts(2322)",
          "tags": Array [],
        },
      ]
    `);

    server.openFile(project.fileURI('index.custom'), contents);

    expect(server.getDiagnostics(project.fileURI('index.custom'))).toMatchInlineSnapshot(`
      Array [
        Object {
          "message": "Type 'number' is not assignable to type 'string'.",
          "range": Object {
            "end": Object {
              "character": 14,
              "line": 0,
            },
            "start": Object {
              "character": 4,
              "line": 0,
            },
          },
          "severity": 1,
          "source": "glint:ts(2322)",
          "tags": Array [],
        },
      ]
    `);

    server.updateFile(project.fileURI('index.custom'), contents.replace('123', '"hi"'));

    expect(server.getDiagnostics(project.fileURI('index.custom'))).toEqual([]);
  });

  test('providing hover info', () => {
    let contents = 'let identifier = "hello";';

    project.write('.glintrc', `environment: custom-test`);
    project.write('index.custom', contents);

    let server = project.startLanguageServer();
    let hover = server.getHover(project.fileURI('index.custom'), { line: 0, character: 8 });

    expect(hover).toMatchInlineSnapshot(`
      Object {
        "contents": Array [
          Object {
            "language": "ts",
            "value": "let identifier: string",
          },
        ],
        "range": Object {
          "end": Object {
            "character": 14,
            "line": 0,
          },
          "start": Object {
            "character": 4,
            "line": 0,
          },
        },
      }
    `);

    project.write('index.custom', contents.replace('"hello"', '123'));
    server.fileDidChange(project.fileURI('index.custom'));

    hover = server.getHover(project.fileURI('index.custom'), { line: 0, character: 8 });

    expect(hover).toMatchInlineSnapshot(`
      Object {
        "contents": Array [
          Object {
            "language": "ts",
            "value": "let identifier: number",
          },
        ],
        "range": Object {
          "end": Object {
            "character": 14,
            "line": 0,
          },
          "start": Object {
            "character": 4,
            "line": 0,
          },
        },
      }
    `);
  });

  test('resolving conflicts beween overlapping extensions', () => {
    let contents = 'export let identifier = 123`;';

    project.write('.glintrc', `environment: custom-test`);
    project.write('index.ts', contents);
    project.write('index.custom', contents);

    project.write(
      'consumer.ts',
      stripIndent`
        import { identifier } from './index';

        identifier;
      `
    );

    let consumerURI = project.fileURI('consumer.ts');
    let server = project.startLanguageServer();

    let definitions = server.getDefinition(consumerURI, { line: 2, character: 4 });
    let diagnostics = server.getDiagnostics(consumerURI);

    expect(definitions).toMatchObject([{ uri: project.fileURI('index.ts') }]);
    expect(diagnostics).toEqual([]);

    project.remove('index.ts');
    server.fileDidChange(project.fileURI('index.ts'));

    definitions = server.getDefinition(consumerURI, { line: 2, character: 4 });
    diagnostics = server.getDiagnostics(consumerURI);

    expect(definitions).toMatchObject([{ uri: project.fileURI('index.custom') }]);
    expect(diagnostics).toEqual([]);

    project.remove('index.custom');
    server.fileDidChange(project.fileURI('index.custom'));

    diagnostics = server.getDiagnostics(consumerURI);

    expect(diagnostics).toMatchObject([
      {
        source: 'glint:ts(2306)',
        range: {
          start: { line: 0, character: 27 },
          end: { line: 0, character: 36 },
        },
      },
    ]);
  });
});
