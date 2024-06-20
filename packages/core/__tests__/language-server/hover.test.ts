import { Project } from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';

describe('Language Server: Hover', () => {
  let project!: Project;

  beforeEach(async () => {
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test.skip('querying a standalone template', async () => {
    project.setGlintConfig({ environment: 'ember-loose' });
    project.write('index.hbs', '<Foo as |foo|>{{foo}}</Foo>');

    let server = await project.startLanguageServer();
    let info = await server.sendHoverRequest(project.fileURI('index.hbs'), {
      line: 0,
      character: 17,
    });

    expect(info).toEqual({
      contents: [{ language: 'ts', value: 'const foo: any' }],
      range: {
        start: { line: 0, character: 16 },
        end: { line: 0, character: 19 },
      },
    });
  });

  test('using private properties', async () => {
    project.write({
      'index.gts': stripIndent`
        import Component from '@glimmer/component';

        export default class MyComponent extends Component {
          /** A message. */
          private message = 'hi';

          <template>
            {{this.message}}
          </template>
        }
      `,
    });

    let server = await project.startLanguageServer();
    let messageInfo = await server.sendHoverRequest(project.fileURI('index.gts'), {
      line: 7,
      character: 12,
    });

    expect(messageInfo).toMatchInlineSnapshot(`
      {
        "contents": {
          "kind": "markdown",
          "value": "\`\`\`typescript
      (property) MyComponent.message: string
      \`\`\`

      A message.",
        },
        "range": {
          "end": {
            "character": 18,
            "line": 7,
          },
          "start": {
            "character": 11,
            "line": 7,
          },
        },
      }
    `);
  });

  test('using args', async () => {
    project.write({
      'index.gts': stripIndent`
        import Component from '@glimmer/component';

        interface MyComponentArgs {
          /** Some string */
          str: string;
        }

        export default class MyComponent extends Component<{ Args: MyComponentArgs }> {
          <template>
            {{@str}}
          </template>
        }
      `,
    });

    let server = await project.startLanguageServer();
    let strInfo = await server.sendHoverRequest(project.fileURI('index.gts'), {
      line: 9,
      character: 7,
    });

    // {{@str}} in the template matches back to the arg definition
    expect(strInfo).toMatchInlineSnapshot(`
      {
        "contents": {
          "kind": "markdown",
          "value": "\`\`\`typescript
      (property) MyComponentArgs.str: string
      \`\`\`

      Some string",
        },
        "range": {
          "end": {
            "character": 10,
            "line": 9,
          },
          "start": {
            "character": 7,
            "line": 9,
          },
        },
      }
    `);
  });

  test('curly block params', async () => {
    project.write({
      'index.gts': stripIndent`
        import Component from '@glimmer/component';

        export default class MyComponent extends Component {
          <template>
            {{#each "abc" as |item index|}}
              Item #{{index}}: {{item}}<br>
            {{/each}}
          </template>
        }
      `,
    });

    let server = await project.startLanguageServer();
    let indexInfo = await server.sendHoverRequest(project.fileURI('index.gts'), {
      line: 5,
      character: 14,
    });

    // {{index}} in the template matches back to the block param
    expect(indexInfo).toMatchInlineSnapshot(`
      {
        "contents": {
          "kind": "markdown",
          "value": "\`\`\`typescript
      const index: number
      \`\`\`",
        },
        "range": {
          "end": {
            "character": 19,
            "line": 5,
          },
          "start": {
            "character": 14,
            "line": 5,
          },
        },
      }
    `);

    let itemInfo = await server.sendHoverRequest(project.fileURI('index.gts'), {
      line: 5,
      character: 25,
    });

    // {{item}} in the template matches back to the block param
    expect(itemInfo).toMatchInlineSnapshot(`
      {
        "contents": {
          "kind": "markdown",
          "value": "\`\`\`typescript
      const item: string
      \`\`\`",
        },
        "range": {
          "end": {
            "character": 29,
            "line": 5,
          },
          "start": {
            "character": 25,
            "line": 5,
          },
        },
      }
    `);
  });

  test.only('module details', async () => {
    project.write({
      'foo.ts': stripIndent`
        export const foo = 'hi';
      `,
      'index.ts': stripIndent`
        import { foo } from './foo';

        console.log(foo);
      `,
    });

    let server = await project.startLanguageServer();
    let info = await server.sendHoverRequest(project.fileURI('index.ts'), {
      line: 0,
      character: 24,
    });

    expect(info).toMatchInlineSnapshot(`
      {
        "contents": {
          "kind": "markdown",
          "value": "\`\`\`typescript
      module "/path/to/EPHEMERAL_TEST_PROJECT/foo"
      \`\`\`",
        },
        "range": {
          "end": {
            "character": 27,
            "line": 0,
          },
          "start": {
            "character": 20,
            "line": 0,
          },
        },
      }
    `);
  });

  describe.skip('JS in a TS project', () => {
    test('with allowJs: true', async () => {
      let tsconfig = JSON.parse(project.read('tsconfig.json'));
      tsconfig.glint = { environment: 'ember-loose' };
      tsconfig.compilerOptions.allowJs = true;
      project.write('tsconfig.json', JSON.stringify(tsconfig));

      project.write({
        'index.hbs': '{{this.message}}',
        'index.js': stripIndent`
          import Component from '@glimmer/component';

          export default class MyComponent extends Component {
            message = 'hi';
          }
        `,
      });

      let server = await project.startLanguageServer();
      let info = await server.sendHoverRequest(project.fileURI('index.hbs'), {
        line: 0,
        character: 10,
      });

      expect(server.getDiagnostics(project.fileURI('index.hbs'))).toEqual([]);
      expect(server.getDiagnostics(project.fileURI('index.js'))).toEqual([]);

      expect(info).toEqual({
        contents: [{ language: 'ts', value: '(property) MyComponent.message: string' }],
        range: {
          start: { line: 0, character: 7 },
          end: { line: 0, character: 14 },
        },
      });
    });

    test('allowJs: false', async () => {
      let tsconfig = JSON.parse(project.read('tsconfig.json'));
      tsconfig.glint = { environment: 'ember-loose' };
      tsconfig.compilerOptions.allowJs = false;
      project.write('tsconfig.json', JSON.stringify(tsconfig));

      project.write({
        'index.hbs': '{{this.message}}',
        'index.js': stripIndent`
          import Component from '@glimmer/component';

          export default class MyComponent extends Component {
            message = 'hi';
          }
        `,
      });

      let server = await project.startLanguageServer();
      let info = await server.sendHoverRequest(project.fileURI('index.hbs'), {
        line: 0,
        character: 10,
      });

      expect(server.getDiagnostics(project.fileURI('index.hbs'))).toEqual([]);
      expect(server.getDiagnostics(project.fileURI('index.js'))).toEqual([]);

      expect(info).toEqual(undefined);
    });
  });
});
