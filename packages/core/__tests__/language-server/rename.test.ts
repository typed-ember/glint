import { afterEach, beforeEach, describe, expect, test } from 'vitest';

test('maybe reinstate these tests');

/*
TODO: decide whether worth reinstating post Volar

import { Project } from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';

describe('Language Server: Renaming Symbols', () => {
  let project!: Project;

  beforeEach(async () => {
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test.skip('querying an standalone template', async () => {
    project.setGlintConfig({ environment: 'ember-loose' });
    project.write('index.hbs', '<Foo as |foo|>{{foo}}</Foo>');

    let server = await project.startLanguageServer();
    let workspaceEdits = await server.sendRenameRequest(
      project.fileURI('index.hbs'),
      { line: 0, character: 11 },
      'bar',
    );

    expect(workspaceEdits).toEqual({
      changes: {
        [project.fileURI('index.hbs')]: [
          {
            newText: 'bar',
            range: {
              start: { line: 0, character: 9 },
              end: { line: 0, character: 12 },
            },
          },
          {
            newText: 'bar',
            range: {
              start: { line: 0, character: 16 },
              end: { line: 0, character: 19 },
            },
          },
        ],
      },
    });
  });

  test('preparing rename-able and unrename-able elements', async () => {
    project.write({
      'index.gts': stripIndent`
        import Component from '@glimmer/component';

        type GreetingArgs = {
          message: string;
        };

        export default class Greeting extends Component<{ Args: GreetingArgs }> {
          private foo = 'hi';

          <template>
            {{this.foo}}
            {{@missingArg}}
          </template>
        }
      `,
    });

    let server = await project.startLanguageServer();
    const { uri } = await server.openTextDocument(project.filePath('index.gts'), 'glimmer-ts');

    const renameSuccessful = await server.sendPrepareRenameRequest(uri, {
      line: 10,
      character: 12,
    });

    expect(renameSuccessful).toEqual({
      start: { line: 10, character: 11 },
      end: { line: 10, character: 14 },
    });

    try {
      await server.sendPrepareRenameRequest(uri, {
        line: 11,
        character: 10,
      });
      expect.fail('Should not get here');
    } catch (e) {
      expect((e as Error).message).toEqual('You cannot rename this element.');
    }
  });

  // TODO: skipped because renaming might not be fully implemented for .gts files
  test.skip('renaming an arg', async () => {
    project.write({
      'greeting.gts': stripIndent`
        import Component from '@glimmer/component';

        export type GreetingArgs = {
          message: string;
        };

        export default class Greeting extends Component<{ Args: GreetingArgs }> {
          <template>{{@message}}, World!</template>
        }
      `,
      'index.gts': stripIndent`
        import Component from '@glimmer/component';
        import Greeting from './greeting';

        export class Application extends Component {
          <template>
            <Greeting @message="Hello" />
          </template>
        }
      `,
    });

    let server = await project.startLanguageServer();
    let expectedWorkspaceEdit = {
      changes: {
        [project.fileURI('greeting.gts')]: [
          {
            newText: 'greeting',
            range: {
              end: { character: 22, line: 7 },
              start: { character: 15, line: 7 },
            },
          },
          {
            newText: 'greeting',
            range: {
              end: { character: 9, line: 3 },
              start: { character: 2, line: 3 },
            },
          },
        ],
        [project.fileURI('index.gts')]: [
          {
            newText: 'greeting',
            range: {
              end: { character: 22, line: 5 },
              start: { character: 15, line: 5 },
            },
          },
        ],
      },
    };

    // Rename `@message` at the point where we pass it to the component
    await server.openTextDocument(project.filePath('index.gts'), 'glimmer-ts');

    let renamePassedArg = await server.sendRenameRequest(
      project.fileURI('index.gts'),
      { line: 5, character: 17 },
      'greeting',
    );

    expect(renamePassedArg).toEqual(expectedWorkspaceEdit);

    await server.openTextDocument(project.filePath('greeting.gts'), 'glimmer-ts');

    // Rename `@message` where we use it in the template
    let renameReferencedArg = await server.sendRenameRequest(
      project.fileURI('greeting.gts'),
      { line: 7, character: 31 },
      'greeting',
    );

    expect(renameReferencedArg).toEqual(expectedWorkspaceEdit);

    // Rename `@message` where we its type is declared
    let renameDeclaredArg = await server.sendRenameRequest(
      project.fileURI('greeting.gts'),
      { line: 3, character: 2 },
      'greeting',
    );

    expect(renameDeclaredArg).toEqual(expectedWorkspaceEdit);
  });

  test('renaming a block param', async () => {
    project.write({
      'index.gts': stripIndent`
        import Component from '@glimmer/component';

        export default class Application extends Component {
          <template>
            {{#each (array 'a' 'b' 'c') as |letter|}}
              {{letter}}
            {{/each}}
          </template>
        }
      `,
    });

    let server = await project.startLanguageServer();
    let expectedWorkspaceEdit = {
      changes: {
        [project.fileURI('index.gts')]: [
          {
            newText: 'character',
            range: {
              start: { line: 5, character: 8 },
              end: { line: 5, character: 14 },
            },
          },
          {
            newText: 'character',
            range: {
              start: { line: 4, character: 36 },
              end: { line: 4, character: 42 },
            },
          },
        ],
      },
    };

    // Rename the param where it's defined in bars
    let renameDefinition = await server.sendRenameRequest(
      project.fileURI('index.gts'),
      { line: 4, character: 38 },
      'character',
    );

    expect(renameDefinition).toEqual(expectedWorkspaceEdit);

    // Rename the param where it's used in curlies
    let renameUsage = await server.sendRenameRequest(
      project.fileURI('index.gts'),
      { line: 5, character: 10 },
      'character',
    );

    expect(renameUsage).toEqual(expectedWorkspaceEdit);
  });

  test('renaming a component', async () => {
    project.write({
      'greeting.gts': stripIndent`
        import Component from '@glimmer/component';

        export type GreetingArgs = {
          message: string;
        };

        export default class Greeting extends Component<{ Args: GreetingArgs }> {
          <template>{{@message}}, World!</template>
        }
      `,
      // fails when you try to change it here
      'index.gts': stripIndent`
        import Component from '@glimmer/component';
        import Greeting from './greeting';

        export class Application extends Component {
          <template>
            <Greeting @message="Hello" />
          </template>
        }
      `,
    });

    let server = await project.startLanguageServer();

    const expectedIndexGtsChanges = [
      {
        newText: 'Salutation',
        range: {
          start: { line: 5, character: 5 },
          end: { line: 5, character: 13 },
        },
      },
      {
        newText: 'Salutation',
        range: {
          start: { line: 1, character: 7 },
          end: { line: 1, character: 15 },
        },
      },
    ];

    let expectedWorkspaceEdit = {
      changes: {
        [project.fileURI('greeting.gts')]: [
          {
            newText: 'Salutation',
            range: {
              start: { line: 6, character: 21 },
              end: { line: 6, character: 29 },
            },
          },
        ],
        [project.fileURI('index.gts')]: expectedIndexGtsChanges,
      },
    };

    // Rename the component class where it's defined
    let renameDefinition = await server.sendRenameRequest(
      project.fileURI('greeting.gts'),
      { line: 6, character: 24 },
      'Salutation',
    );

    expect(renameDefinition).toEqual(expectedWorkspaceEdit);

    // Rename the component class from where it's invoked
    let renameUsage = await server.sendRenameRequest(
      project.fileURI('index.gts'),
      { line: 5, character: 9 },
      'Salutation',
    );

    // NOTE: this changed since Volar; previously renaming the component class within index.gts
    // would also trigger the source Greeting class to rename itself, but this does not appear
    // to do the same thing as normal TypeScript, and I think Volar brought us more in line
    // with vanilla TS.
    expect(renameUsage).toEqual({
      changes: {
        [project.fileURI('index.gts')]: expectedIndexGtsChanges,
      },
    });
  });
});
*/
