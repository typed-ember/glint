import { stripIndent } from 'common-tags';
import Protocol, { CommandTypes } from 'typescript/lib/protocol';
import { TSServer, Project } from './test-server';

describe('tsserver plugin', () => {
  let server!: TSServer;
  let project!: Project;

  beforeAll(async () => {
    server = await new TSServer().start({
      listenForDebugger: false,
      printMessages: true,
    });
  });

  beforeEach(async () => {
    project = await new Project(server).create({ printLogContents: false });
  });

  afterEach(async () => {
    await project.destroy();
  });

  afterAll(async () => {
    await server.shutdown();
  });

  describe('quick info', () => {
    test('using private properties', async () => {
      await project.open({
        'index.ts': stripIndent`
          import '@glint/template/glimmerx';
          import Component, { hbs } from '@glimmerx/component';

          export default class MyComponent extends Component {
            /** A message. */
            private message = 'hi';

            static template = hbs\`
              {{this.message}}
            \`;
          }
        `,
      });

      let diagnostics = await project.getDiagnostics('index.ts');

      // Clean bill of health
      expect(diagnostics).toEqual([]);

      let messageInfo = await server.request(CommandTypes.Quickinfo, {
        file: project.filePath('index.ts'),
        line: 9,
        offset: 13,
      });

      // {{this.message}} in the template matches back to the private property
      expect(messageInfo?.documentation).toEqual('A message.');
      expect(messageInfo?.start).toEqual({ line: 9, offset: 12 });
      expect(messageInfo?.end).toEqual({ line: 9, offset: 19 });
      expect(messageInfo?.displayString).toEqual('(property) MyComponent.message: string');
    });

    test('using args', async () => {
      await project.open({
        'index.ts': stripIndent`
          import '@glint/template/glimmerx';
          import Component, { hbs } from '@glimmerx/component';

          interface MyComponentArgs {
            /** Some string */
            str: string;
          }

          export default class MyComponent extends Component<MyComponentArgs> {
            static template = hbs\`
              {{@str}}
            \`;
          }
        `,
      });

      let diagnostics = await project.getDiagnostics('index.ts');

      // Clean bill of health
      expect(diagnostics).toEqual([]);

      let strInfo = await server.request(CommandTypes.Quickinfo, {
        file: project.filePath('index.ts'),
        line: 11,
        offset: 8,
      });

      // {{@str}} in the template matches back to the arg definition
      expect(strInfo?.documentation).toEqual('Some string');
      expect(strInfo?.start).toEqual({ line: 11, offset: 8 });
      expect(strInfo?.end).toEqual({ line: 11, offset: 11 });
      expect(strInfo?.displayString).toEqual('(property) MyComponentArgs.str: string');
    });

    test('curly block params', async () => {
      await project.open({
        'index.ts': stripIndent`
          import '@glint/template/glimmerx';
          import Component, { hbs } from '@glimmerx/component';

          export default class MyComponent extends Component {
            static template = hbs\`
              {{#each (array 'a' 'b' 'c') as |item index|}}
                Item #{{index}}: {{item}}<br>
              {{/each}}
            \`;
          }
        `,
      });

      let diagnostics = await project.getDiagnostics('index.ts');

      // Clean bill of health
      expect(diagnostics).toEqual([]);

      let indexInfo = await server.request(CommandTypes.Quickinfo, {
        file: project.filePath('index.ts'),
        line: 7,
        offset: 15,
      });

      // {{index}} in the template matches back to the block param
      expect(indexInfo?.start).toEqual({ line: 7, offset: 15 });
      expect(indexInfo?.end).toEqual({ line: 7, offset: 20 });
      expect(indexInfo?.displayString).toEqual('var index: number');

      let itemInfo = await server.request(CommandTypes.Quickinfo, {
        file: project.filePath('index.ts'),
        line: 7,
        offset: 26,
      });

      // {{item}} in the template matches back to the block param
      expect(itemInfo?.start).toEqual({ line: 7, offset: 26 });
      expect(itemInfo?.end).toEqual({ line: 7, offset: 30 });
      expect(itemInfo?.displayString).toEqual('var item: string');
    });

    test('module details', async () => {
      await project.open({
        'foo.ts': stripIndent`
          export const foo = 'hi';
        `,
        'index.ts': stripIndent`
          import { foo } from './foo';

          console.log(foo);
        `,
      });

      let info = await server.request(CommandTypes.Quickinfo, {
        file: project.filePath('index.ts'),
        line: 1,
        offset: 25,
      });

      expect(info?.start).toEqual({ line: 1, offset: 21 });
      expect(info?.end).toEqual({ line: 1, offset: 28 });
      expect(info?.displayString).toEqual(`module "${project.filePath('foo')}"`);
    });
  });

  describe('completions', () => {
    test('passing component args', async () => {
      await project.open({
        'index.ts': stripIndent`
          import '@glint/template/glimmerx';
          import Component, { hbs } from '@glimmerx/component';

          export default class MyComponent extends Component {
            static template = hbs\`
              <Inner @ />
            \`;
          }

          class Inner extends Component<{ foo?: string; bar?: number }> {}
        `,
      });

      let completions = await server.request(CommandTypes.CompletionInfo, {
        file: project.filePath('index.ts'),
        line: 6,
        offset: 12,
      });

      expect(completions).toEqual({
        isGlobalCompletion: false,
        isMemberCompletion: true,
        isNewIdentifierLocation: false,
        entries: [
          {
            name: 'bar',
            kind: 'property',
            kindModifiers: 'optional',
            sortText: '1',
          },
          {
            name: 'foo',
            kind: 'property',
            kindModifiers: 'optional',
            sortText: '1',
          },
        ],
      });

      let details = await server.request(CommandTypes.CompletionDetails, {
        file: project.filePath('index.ts'),
        line: 6,
        offset: 12,
        entryNames: ['bar'],
      });

      let detailString = details?.[0]?.displayParts.map((part) => part.text).join('');
      expect(detailString).toEqual('(property) bar?: number | undefined');
    });

    test('referencing class properties', async () => {
      await project.open({
        'index.ts': stripIndent`
          import '@glint/template/glimmerx';
          import Component, { hbs } from '@glimmerx/component';

          export default class MyComponent extends Component {
            private message = 'hello';

            static template = hbs\`
              {{this.m}}
            \`;
          }
        `,
      });

      let completions = await server.request(CommandTypes.CompletionInfo, {
        file: project.filePath('index.ts'),
        line: 8,
        offset: 13,
      });

      expect(completions?.entries).toContainEqual({
        kind: 'property',
        kindModifiers: 'private',
        name: 'message',
        sortText: '0',
      });

      let details = await server.request(CommandTypes.CompletionDetails, {
        file: project.filePath('index.ts'),
        line: 8,
        offset: 13,
        entryNames: ['message'],
      });

      let detailString = details?.[0]?.displayParts.map((part) => part.text).join('');
      expect(detailString).toEqual('(property) MyComponent.message: string');
    });

    test('referencing own args', async () => {
      await project.open({
        'index.ts': stripIndent`
          import '@glint/template/glimmerx';
          import Component, { hbs } from '@glimmerx/component';

          interface MyComponentArgs<T> {
            items: Set<T>;
          }

          export default class MyComponent<T> extends Component<MyComponentArgs<T>> {
            static template = hbs\`
              {{@i}}
            \`;
          }
        `,
      });

      let completions = await server.request(CommandTypes.CompletionInfo, {
        file: project.filePath('index.ts'),
        line: 10,
        offset: 9,
      });

      expect(completions?.entries).toContainEqual({
        kind: 'property',
        kindModifiers: '',
        name: 'items',
        sortText: '0',
      });

      let details = await server.request(CommandTypes.CompletionDetails, {
        file: project.filePath('index.ts'),
        line: 10,
        offset: 9,
        entryNames: ['items'],
      });

      let detailString = details?.[0]?.displayParts.map((part) => part.text).join('');
      expect(detailString).toEqual('(property) MyComponentArgs<T>.items: Set<T>');
    });

    test('referencing block params', async () => {
      await project.open({
        'index.ts': stripIndent`
          import '@glint/template/glimmerx';
          import Component, { hbs } from '@glimmerx/component';

          export default class MyComponent<T> extends Component {
            static template = hbs\`
              {{#each (array "a" "b" "c") as |letter|}}
                {{l}}
              {{/each}}
            \`;
          }
        `,
      });

      let completions = await server.request(CommandTypes.CompletionInfo, {
        file: project.filePath('index.ts'),
        line: 7,
        offset: 8,
      });

      expect(completions?.entries).toContainEqual({
        kind: 'var',
        kindModifiers: '',
        name: 'letter',
        sortText: '0',
      });

      let details = await server.request(CommandTypes.CompletionDetails, {
        file: project.filePath('index.ts'),
        line: 7,
        offset: 8,
        entryNames: ['letter'],
      });

      let detailString = details?.[0]?.displayParts.map((part) => part.text).join('');
      expect(detailString).toEqual('var letter: string');
    });

    test('referencing module-scope identifiers', async () => {
      await project.open({
        'index.ts': stripIndent`
          import '@glint/template/glimmerx';
          import Component, { hbs } from '@glimmerx/component';

          const greeting: string = 'hello';

          export default class MyComponent<T> extends Component {
            static template = hbs\`
              {{g}}
            \`;
          }
        `,
      });

      let completions = await server.request(CommandTypes.CompletionInfo, {
        file: project.filePath('index.ts'),
        line: 8,
        offset: 8,
      });

      expect(completions?.entries).toContainEqual({
        kind: 'const',
        kindModifiers: '',
        name: 'greeting',
        sortText: '0',
      });

      let details = await server.request(CommandTypes.CompletionDetails, {
        file: project.filePath('index.ts'),
        line: 8,
        offset: 8,
        entryNames: ['greeting'],
      });

      let detailString = details?.[0]?.displayParts.map((part) => part.text).join('');
      expect(detailString).toEqual('const greeting: string');
    });

    test('auto-import from other modules', async () => {
      await project.open({
        'greeting.ts': stripIndent`
          import Component from '@glimmerx/component';
          export default class Greeting extends Component {}
        `,

        'index.ts': stripIndent`
          import '@glint/template/glimmerx';
          import Component, { hbs } from '@glimmerx/component';

          export default class MyComponent<T> extends Component {
            static template = hbs\`
              <Gree />
            \`;
          }
        `,
      });

      let completions = await server.request(CommandTypes.CompletionInfo, {
        file: project.filePath('index.ts'),
        includeExternalModuleExports: true,
        line: 6,
        offset: 10,
      });

      expect(completions?.entries).toContainEqual({
        name: 'Greeting',
        kind: 'class',
        kindModifiers: 'export',
        sortText: '5',
        hasAction: true,
        source: project.filePath('greeting'),
      });

      let details = await server.request(CommandTypes.CompletionDetails, {
        file: project.filePath('index.ts'),
        line: 6,
        offset: 10,
        entryNames: [{ name: 'Greeting', source: project.filePath('greeting') }],
      });

      let detailString = details?.[0]?.displayParts.map((part) => part.text).join('');
      expect(detailString).toEqual('class Greeting');
      expect(details?.[0]?.codeActions).toEqual([
        {
          description: 'Import default \'Greeting\' from module "./greeting"',
          changes: [
            {
              fileName: project.filePath('index.ts'),
              textChanges: [
                {
                  newText: `import Greeting from './greeting';\n`,
                  start: { line: 3, offset: 1 },
                  end: { line: 3, offset: 1 },
                },
              ],
            },
          ],
        },
      ]);
    });

    test.skip('auto-import from other modules when an import is already present', async () => {
      await project.open({
        'greeting.ts': stripIndent`
          import Component from '@glimmerx/component';
          export type Name = string;
          export default class Greeting extends Component {}
        `,

        'index.ts': stripIndent`
          import '@glint/template/glimmerx';
          import Component, { hbs } from '@glimmerx/component';
          import { Name } from './greeting';

          export default class MyComponent<T> extends Component {
            static template = hbs\`
              <Gree />
            \`;
          }
        `,
      });

      let completions = await server.request(CommandTypes.CompletionInfo, {
        file: project.filePath('index.ts'),
        includeExternalModuleExports: true,
        line: 7,
        offset: 10,
      });

      expect(completions?.entries).toContainEqual({
        name: 'Greeting',
        kind: 'class',
        kindModifiers: 'export',
        sortText: '5',
        hasAction: true,
        source: project.filePath('greeting'),
      });

      let details = await server.request(CommandTypes.CompletionDetails, {
        file: project.filePath('index.ts'),
        line: 7,
        offset: 10,
        entryNames: [{ name: 'Greeting', source: project.filePath('greeting') }],
      });

      let detailString = details?.[0]?.displayParts.map((part) => part.text).join('');
      expect(detailString).toEqual('class Greeting');
      expect(details?.[0]?.codeActions).toEqual([
        {
          description: `Add default import 'Greeting' to existing import declaration from "./greeting"`,
          changes: [
            {
              fileName: project.filePath('index.ts'),
              textChanges: [
                {
                  newText: 'Greeting, ',
                  start: { line: 3, offset: 8 },
                  end: { line: 3, offset: 8 },
                },
              ],
            },
          ],
        },
      ]);
    });
  });

  describe('references', () => {
    function sortRefs(refs?: ReadonlyArray<Protocol.ReferencesResponseItem>): void {
      (refs as Array<Protocol.ReferencesResponseItem> | undefined)?.sort((a, b) => {
        return a.lineText > b.lineText ? 1 : -1;
      });
    }

    test('component references', async () => {
      await project.open({
        'lib.ts': `import '@glint/template/glimmerx';`,
        'greeting.ts': stripIndent`
          import Component, { hbs } from '@glimmerx/component';

          export default class Greeting extends Component {
            private nested = Math.random() > 0.5;

            static template = hbs\`
              {{#if this.nested}}
                <Greeting />!
              {{else}}
                Hello!
              {{/if}}
            \`;
          }
        `,
        'index.ts': stripIndent`
          import Component, { hbs } from '@glimmerx/component';
          import Greeting from './greeting';

          export default class Application extends Component {
            static template = hbs\`
              <Greeting />
            \`;
          }
        `,
      });

      let expectedReferences = [
        {
          file: project.filePath('greeting.ts'),
          lineText: '      <Greeting />!',
          isDefinition: false,
          isWriteAccess: false,
          start: { line: 8, offset: 8 },
          end: { line: 8, offset: 16 },
        },
        {
          file: project.filePath('index.ts'),
          lineText: '    <Greeting />',
          isDefinition: false,
          isWriteAccess: false,
          start: { line: 6, offset: 6 },
          end: { line: 6, offset: 14 },
        },
        {
          file: project.filePath('greeting.ts'),
          lineText: 'export default class Greeting extends Component {',
          isDefinition: true,
          isWriteAccess: true,
          start: { line: 3, offset: 22 },
          end: { line: 3, offset: 30 },
          contextStart: { line: 3, offset: 1 },
          contextEnd: { line: 13, offset: 2 },
        },
        {
          file: project.filePath('index.ts'),
          lineText: `import Greeting from './greeting';`,
          isDefinition: true,
          isWriteAccess: true,
          start: { line: 2, offset: 8 },
          end: { line: 2, offset: 16 },
          contextStart: { line: 2, offset: 1 },
          contextEnd: { line: 2, offset: 35 },
        },
      ];

      let referencesFromClassDeclaration = await server.request(CommandTypes.References, {
        file: project.filePath('greeting.ts'),
        line: 3,
        offset: 25,
      });

      sortRefs(referencesFromClassDeclaration?.refs);
      expect(referencesFromClassDeclaration).toEqual({
        symbolName: 'Greeting',
        symbolDisplayString: 'class Greeting',
        symbolStartOffset: 22,
        refs: expectedReferences,
      });

      let referencesFromComponentInvocation = await server.request(CommandTypes.References, {
        file: project.filePath('index.ts'),
        line: 6,
        offset: 8,
      });

      sortRefs(referencesFromComponentInvocation?.refs);
      expect(referencesFromComponentInvocation).toEqual({
        symbolName: 'Greeting',
        symbolDisplayString: '(alias) class Greeting\nimport Greeting',
        symbolStartOffset: 6,
        refs: expectedReferences,
      });
    });

    test('arg references', async () => {
      await project.open({
        'lib.ts': `import '@glint/template/glimmerx';`,
        'greeting.ts': stripIndent`
          import Component, { hbs } from '@glimmerx/component';

          export interface GreetingArgs {
            /** Who to greet */
            target: string;
          }

          export default class Greeting extends Component<GreetingArgs> {
            static template = hbs\`
              Hello, {{@target}}
            \`;
          }
        `,
        'index.ts': stripIndent`
          import Component, { hbs } from '@glimmerx/component';
          import Greeting from './greeting';

          export default class Application extends Component {
            static template = hbs\`
              <Greeting @target="World" />
            \`;
          }
        `,
      });

      let expectedReferences = [
        {
          file: project.filePath('index.ts'),
          lineText: '    <Greeting @target="World" />',
          isWriteAccess: true,
          isDefinition: true,
          start: { line: 6, offset: 16 },
          end: { line: 6, offset: 22 },
          contextStart: { line: 6, offset: 15 },
          contextEnd: { line: 6, offset: 30 },
        },
        {
          file: project.filePath('greeting.ts'),
          lineText: '    Hello, {{@target}}',
          isWriteAccess: false,
          isDefinition: false,
          start: { line: 10, offset: 15 },
          end: { line: 10, offset: 21 },
        },
        {
          file: project.filePath('greeting.ts'),
          lineText: '  target: string;',
          isWriteAccess: false,
          isDefinition: true,
          start: { line: 5, offset: 3 },
          end: { line: 5, offset: 9 },
          contextStart: { line: 5, offset: 3 },
          contextEnd: { line: 5, offset: 18 },
        },
      ];

      let referencesFromDefinition = await server.request(CommandTypes.References, {
        file: project.filePath('greeting.ts'),
        line: 5,
        offset: 5,
      });

      sortRefs(referencesFromDefinition?.refs);
      expect(referencesFromDefinition).toEqual({
        symbolName: 'target',
        symbolDisplayString: '(property) GreetingArgs.target: string',
        symbolStartOffset: 3,
        refs: expectedReferences,
      });

      let referencesFromInvocation = await server.request(CommandTypes.References, {
        file: project.filePath('index.ts'),
        line: 6,
        offset: 18,
      });

      sortRefs(referencesFromInvocation?.refs);
      expect(referencesFromInvocation).toEqual({
        symbolName: 'target',
        symbolDisplayString: '(property) GreetingArgs.target: string',
        symbolStartOffset: 16,
        refs: expectedReferences,
      });

      let referencesFromUsage = await server.request(CommandTypes.References, {
        file: project.filePath('greeting.ts'),
        line: 10,
        offset: 17,
      });

      sortRefs(referencesFromUsage?.refs);
      expect(referencesFromUsage).toEqual({
        symbolName: 'target',
        symbolDisplayString: '(property) GreetingArgs.target: string',
        symbolStartOffset: 15,
        refs: expectedReferences,
      });
    });
  });

  describe('find definition', () => {
    test('component invocation', async () => {
      await project.open({
        'lib.ts': `import '@glint/template/glimmerx';`,
        'greeting.ts': stripIndent`
          import Component, { hbs } from '@glimmerx/component';
          export default class Greeting extends Component<{ message: string }> {
            static template = hbs\`{{@message}}, World!\`;
          }
        `,
        'index.ts': stripIndent`
          import Component, { hbs } from '@glimmerx/component';
          import Greeting from './greeting';

          export default class Application extends Component {
            static template = hbs\`
              <Greeting @message="hello" />
            \`;
          }
        `,
      });

      let request = {
        file: project.filePath('index.ts'),
        line: 6,
        offset: 8,
      };

      let expectedDefinitions = [
        {
          file: project.filePath('greeting.ts'),
          start: { line: 2, offset: 22 },
          end: { line: 2, offset: 30 },
          contextStart: { line: 2, offset: 1 },
          contextEnd: { line: 4, offset: 2 },
        },
      ];

      let definitions = await server.request(CommandTypes.Definition, request);
      expect(definitions).toEqual(expectedDefinitions);

      let definitionsAndBounds = await server.request(CommandTypes.DefinitionAndBoundSpan, request);
      expect(definitionsAndBounds).toEqual({
        definitions: expectedDefinitions,
        textSpan: {
          start: { line: 6, offset: 6 },
          end: { line: 6, offset: 14 },
        },
      });
    });

    test('arg passing', async () => {
      await project.open({
        'lib.ts': `import '@glint/template/glimmerx';`,
        'greeting.ts': stripIndent`
          import Component, { hbs } from '@glimmerx/component';

          export interface GreetingArgs {
            message: string;
          }

          export default class Greeting extends Component<GreetingArgs> {
            static template = hbs\`{{@message}}, World!\`;
          }
        `,
        'index.ts': stripIndent`
          import Component, { hbs } from '@glimmerx/component';
          import Greeting from './greeting';

          export default class Application extends Component {
            static template = hbs\`
              <Greeting @message="hello" />
            \`;
          }
        `,
      });

      let request = {
        file: project.filePath('index.ts'),
        line: 6,
        offset: 18,
      };

      let expectedDefinitions = [
        {
          file: project.filePath('greeting.ts'),
          start: { line: 4, offset: 3 },
          end: { line: 4, offset: 10 },
          contextStart: { line: 4, offset: 3 },
          contextEnd: { line: 4, offset: 19 },
        },
      ];

      let definitions = await server.request(CommandTypes.Definition, request);
      expect(definitions).toEqual(expectedDefinitions);

      let definitionsAndBounds = await server.request(CommandTypes.DefinitionAndBoundSpan, request);
      expect(definitionsAndBounds).toEqual({
        definitions: expectedDefinitions,
        textSpan: {
          start: { line: 6, offset: 16 },
          end: { line: 6, offset: 23 },
        },
      });
    });

    test('arg use', async () => {
      await project.open({
        'lib.ts': `import '@glint/template/glimmerx';`,
        'greeting.ts': stripIndent`
          import Component, { hbs } from '@glimmerx/component';

          export interface GreetingArgs {
            message: string;
          }

          export default class Greeting extends Component<GreetingArgs> {
            static template = hbs\`{{@message}}, World!\`;
          }
        `,
      });

      let request = {
        file: project.filePath('greeting.ts'),
        line: 8,
        offset: 31,
      };

      let expectedDefinitions = [
        {
          file: project.filePath('greeting.ts'),
          start: { line: 4, offset: 3 },
          end: { line: 4, offset: 10 },
          contextStart: { line: 4, offset: 3 },
          contextEnd: { line: 4, offset: 19 },
        },
      ];

      let definitions = await server.request(CommandTypes.Definition, request);
      expect(definitions).toEqual(expectedDefinitions);

      let definitionsAndBounds = await server.request(CommandTypes.DefinitionAndBoundSpan, request);
      expect(definitionsAndBounds).toEqual({
        definitions: expectedDefinitions,
        textSpan: {
          start: { line: 8, offset: 28 },
          end: { line: 8, offset: 35 },
        },
      });
    });

    test('import source', async () => {
      await project.open({
        'lib.ts': `import '@glint/template/glimmerx';`,
        'greeting.ts': stripIndent`
          import Component, { hbs } from '@glimmerx/component';

          export interface GreetingArgs {
            message: string;
          }

          export default class Greeting extends Component<GreetingArgs> {
            static template = hbs\`{{@message}}, World!\`;
          }
        `,
        'index.ts': stripIndent`
          import Component, { hbs } from '@glimmerx/component';
          import Greeting from './greeting';

          export class Application extends Component {
            static template = hbs\`
              <Greeting @message="Hello" />
            \`;
          }
        `,
      });

      let request = {
        file: project.filePath('index.ts'),
        line: 2,
        offset: 28,
      };

      let expectedDefinitions = [
        {
          file: project.filePath('greeting.ts'),
          start: { line: 1, offset: 1 },
          end: { line: 9, offset: 2 },
        },
      ];

      let definitions = await server.request(CommandTypes.Definition, request);
      expect(definitions).toEqual(expectedDefinitions);

      let definitionsAndBounds = await server.request(CommandTypes.DefinitionAndBoundSpan, request);
      expect(definitionsAndBounds).toEqual({
        definitions: expectedDefinitions,
        textSpan: {
          start: { line: 2, offset: 22 },
          end: { line: 2, offset: 34 },
        },
      });
    });
  });

  describe('renaming symbols', () => {
    test('arg', async () => {
      await project.open({
        'lib.ts': `import '@glint/template/glimmerx';`,
        'greeting.ts': stripIndent`
          import Component, { hbs } from '@glimmerx/component';

          export interface GreetingArgs {
            message: string;
          }

          export default class Greeting extends Component<GreetingArgs> {
            static template = hbs\`{{@message}}, World!\`;
          }
        `,
        'index.ts': stripIndent`
          import Component, { hbs } from '@glimmerx/component';
          import Greeting from './greeting';

          export class Application extends Component {
            static template = hbs\`
              <Greeting @message="Hello" />
            \`;
          }
        `,
      });

      let expectedLocs = [
        {
          file: project.filePath('greeting.ts'),
          locs: [
            {
              start: { line: 4, offset: 3 },
              end: { line: 4, offset: 10 },
              contextStart: { line: 4, offset: 3 },
              contextEnd: { line: 4, offset: 19 },
            },
            {
              start: { line: 8, offset: 28 },
              end: { line: 8, offset: 35 },
            },
          ],
        },
        {
          file: project.filePath('index.ts'),
          locs: [
            {
              start: { line: 6, offset: 16 },
              end: { line: 6, offset: 23 },
              contextStart: { line: 6, offset: 15 },
              contextEnd: { line: 6, offset: 31 },
            },
          ],
        },
      ];

      // Rename from where was pass @message into the componet
      let renamePassedArg = await server.request(CommandTypes.Rename, {
        file: project.filePath('index.ts'),
        line: 6,
        offset: 18,
      });

      expect(renamePassedArg?.locs).toEqual(expectedLocs);
      expect(renamePassedArg?.info).toMatchObject({
        canRename: true,
        displayName: 'message',
        triggerSpan: {
          start: { line: 6, offset: 16 },
          end: { line: 6, offset: 23 },
        },
      });

      // Rename from where we reference @message inside the component's template
      let renameReferencedArg = await server.request(CommandTypes.Rename, {
        file: project.filePath('greeting.ts'),
        line: 8,
        offset: 32,
      });

      expect(renameReferencedArg?.locs).toEqual(expectedLocs);
      expect(renameReferencedArg?.info).toMatchObject({
        canRename: true,
        displayName: 'message',
        triggerSpan: {
          start: { line: 8, offset: 28 },
          end: { line: 8, offset: 35 },
        },
      });

      // Rename from the type where the message arg is defined
      let renameDefinedArg = await server.request(CommandTypes.Rename, {
        file: project.filePath('greeting.ts'),
        line: 4,
        offset: 3,
      });

      expect(renameDefinedArg?.locs).toEqual(expectedLocs);
      expect(renameDefinedArg?.info).toMatchObject({
        canRename: true,
        displayName: 'message',
        triggerSpan: {
          start: { line: 4, offset: 3 },
          end: { line: 4, offset: 10 },
        },
      });
    });

    test('block param', async () => {
      await project.open({
        'lib.ts': `import '@glint/template/glimmerx';`,
        'index.ts': stripIndent`
          import Component, { hbs } from '@glimmerx/component';

          export default class Application extends Component {
            static template = hbs\`
              {{#each (array 'a' 'b' 'c') as |letter|}}
                {{letter}}
              {{/each}}
            \`;
          }
        `,
      });

      let expectedLocs = [
        {
          file: project.filePath('index.ts'),
          locs: [
            {
              start: { line: 5, offset: 37 },
              end: { line: 5, offset: 43 },
              contextStart: { line: 5, offset: 5 },
              contextEnd: { line: 7, offset: 14 },
            },
            {
              start: { line: 6, offset: 9 },
              end: { line: 6, offset: 15 },
            },
          ],
        },
      ];

      // Rename the param where it's defined in bars
      let renameDefinition = await server.request(CommandTypes.Rename, {
        file: project.filePath('index.ts'),
        line: 5,
        offset: 39,
      });

      expect(renameDefinition?.locs).toEqual(expectedLocs);
      expect(renameDefinition?.info).toMatchObject({
        canRename: true,
        displayName: 'letter',
        triggerSpan: {
          start: { line: 5, offset: 37 },
          end: { line: 5, offset: 43 },
        },
      });

      // Rename the param where it's used in curlies
      let renameUsage = await server.request(CommandTypes.Rename, {
        file: project.filePath('index.ts'),
        line: 6,
        offset: 11,
      });

      expect(renameUsage?.locs).toEqual(expectedLocs);
      expect(renameUsage?.info).toMatchObject({
        canRename: true,
        displayName: 'letter',
        triggerSpan: {
          start: { line: 6, offset: 9 },
          end: { line: 6, offset: 15 },
        },
      });
    });

    test('component', async () => {
      await project.open({
        'lib.ts': `import '@glint/template/glimmerx';`,
        'greeting.ts': stripIndent`
          import Component, { hbs } from '@glimmerx/component';

          export interface GreetingArgs {
            message: string;
          }

          export default class Greeting extends Component<GreetingArgs> {
            static template = hbs\`{{@message}}, World!\`;
          }
        `,
        'index.ts': stripIndent`
          import Component, { hbs } from '@glimmerx/component';
          import Greeting from './greeting';

          export class Application extends Component {
            static template = hbs\`
              <Greeting @message="Hello" />
            \`;
          }
        `,
      });

      let expectedLocs = new Set([
        {
          file: project.filePath('greeting.ts'),
          locs: [
            {
              start: { line: 7, offset: 22 },
              end: { line: 7, offset: 30 },
              contextStart: { line: 7, offset: 1 },
              contextEnd: { line: 9, offset: 2 },
            },
          ],
        },
        {
          file: project.filePath('index.ts'),
          locs: [
            {
              start: { line: 2, offset: 8 },
              end: { line: 2, offset: 16 },
              contextStart: { line: 2, offset: 1 },
              contextEnd: { line: 2, offset: 35 },
            },
            {
              start: { line: 6, offset: 6 },
              end: { line: 6, offset: 14 },
            },
          ],
        },
      ]);

      // Rename the component class where it's defined
      let renameDefinition = await server.request(CommandTypes.Rename, {
        file: project.filePath('greeting.ts'),
        line: 7,
        offset: 25,
      });

      expect(new Set(renameDefinition?.locs)).toEqual(expectedLocs);
      expect(renameDefinition?.info).toMatchObject({
        canRename: true,
        displayName: 'Greeting',
        triggerSpan: {
          start: { line: 7, offset: 22 },
          end: { line: 7, offset: 30 },
        },
      });

      // Rename the component class from where it's invoked
      let renameUsage = await server.request(CommandTypes.Rename, {
        file: project.filePath('index.ts'),
        line: 6,
        offset: 10,
      });

      expect(new Set(renameUsage?.locs)).toEqual(expectedLocs);
      expect(renameUsage?.info).toMatchObject({
        canRename: true,
        displayName: 'Greeting',
        triggerSpan: {
          start: { line: 6, offset: 6 },
          end: { line: 6, offset: 14 },
        },
      });
    });

    test('module', async () => {
      await project.open({
        'lib.ts': `import '@glint/template/glimmerx';`,
        'greeting.ts': stripIndent`
          import Component, { hbs } from '@glimmerx/component';

          export interface GreetingArgs {
            message: string;
          }

          export default class Greeting extends Component<GreetingArgs> {
            static template = hbs\`{{@message}}, World!\`;
          }
        `,
        'index.ts': stripIndent`
          import Component, { hbs } from '@glimmerx/component';
          import Greeting from './greeting';

          export class Application extends Component {
            static template = hbs\`
              <Greeting @message="Hello" />
            \`;
          }
        `,
      });

      let result = await server.request(CommandTypes.GetEditsForFileRename, {
        oldFilePath: project.filePath('greeting.ts'),
        newFilePath: project.filePath('shiny-new-greeting.ts'),
      });

      expect(result).toEqual([
        {
          fileName: project.filePath('index.ts'),
          textChanges: [
            {
              newText: './shiny-new-greeting',
              start: { line: 2, offset: 23 },
              end: { line: 2, offset: 33 },
            },
          ],
        },
      ]);
    });
  });

  describe('error recovery', () => {
    test('introducing and fixing a template error with editor changes', async () => {
      await project.open({
        'index.ts': stripIndent`
          import '@glint/template/glimmerx';
          import Component, { hbs } from '@glimmerx/component';

          export default class MyComponent extends Component {
            static template = hbs\`
              {{debugger}}
            \`;
          }
        `,
      });

      let diagnostics = await project.getDiagnostics('index.ts');

      // Clean bill of health
      expect(diagnostics).toEqual([]);

      // Typo `debugger` to `debuggerr`
      await project.update('index.ts', {
        start: { line: 6, offset: 15 },
        end: { line: 6, offset: 15 },
        newText: 'r',
      });

      diagnostics = await project.getDiagnostics('index.ts');

      expect(diagnostics.length).toEqual(2);

      expect(diagnostics[0]).toMatchObject({
        message: `Object is of type 'unknown'.`,
        startLocation: { line: 6, offset: 5 },
        endLocation: { line: 6, offset: 18 },
      });

      expect(diagnostics[1]).toMatchObject({
        message: `Property 'debuggerr' does not exist on type 'BuiltIns'. Did you mean 'debugger'?`,
        startLocation: { line: 6, offset: 7 },
        endLocation: { line: 6, offset: 16 },
      });

      // Fix the typo
      await project.update('index.ts', {
        start: { line: 6, offset: 15 },
        end: { line: 6, offset: 16 },
        newText: '',
      });

      diagnostics = await project.getDiagnostics('index.ts');

      expect(diagnostics).toEqual([]);
    });

    test('introducing and fixing a TS syntax error with editor changes', async () => {
      await project.open({
        'index.ts': stripIndent`
          import '@glint/template/glimmerx';
          import Component, { hbs } from '@glimmerx/component';

          export default class MyComponent extends Component {
            private message = 'hello';
            static template = hbs\`
              {{this.message}}
            \`;
          }
        `,
      });

      let diagnostics = await project.getDiagnostics('index.ts');

      // Clean bill of health
      expect(diagnostics).toEqual([]);

      // Add an extra `i` at the beginning
      await project.update('index.ts', {
        start: { line: 1, offset: 1 },
        end: { line: 1, offset: 1 },
        newText: 'i',
      });

      diagnostics = await project.getDiagnostics('index.ts');

      let typo = diagnostics.find((d) => d.start === 0) as Protocol.DiagnosticWithLinePosition;

      expect(typo?.message).toEqual(`Cannot find name 'iimport'.`);

      // Fix the typo
      await project.update('index.ts', {
        start: { line: 1, offset: 1 },
        end: { line: 1, offset: 2 },
        newText: '',
      });

      diagnostics = await project.getDiagnostics('index.ts');

      expect(diagnostics).toEqual([]);
    });
  });
});
