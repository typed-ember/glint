import { Project } from 'glint-monorepo-test-utils';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';

describe('Language Server: Folding Ranges', () => {
  let project!: Project;

  beforeEach(async () => {
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('function', () => {
    project.write({
      'example.ts': stripIndent`
        function foo() {
          return 'bar';
        }
      `,
    });

    let server = project.startLanguageServer();
    let folds = server.getFoldingRanges(project.fileURI('example.ts'));

    expect(folds).toEqual([
      {
        startLine: 0,
        endLine: 1,
        kind: undefined,
      },
    ]);
  });

  test('nested function', () => {
    project.write({
      'example.ts': stripIndent`
        function topLevel() {

          function nested() {
            return 'bar';
          }

          return nested();
        }
      `,
    });

    let server = project.startLanguageServer();
    let folds = server.getFoldingRanges(project.fileURI('example.ts'));

    expect(folds).toEqual([
      {
        startLine: 0,
        endLine: 6,
        kind: undefined,
      },
      {
        startLine: 2,
        endLine: 3,
        kind: undefined,
      },
    ]);
  });

  test('imports', () => {
    project.write({
      'example.ts': stripIndent`
        import Component, { hbs } from '@glimmerx/component';
        import foo from 'bar';
        import { baz } from 'qux';

        export default { foo, baz, Component };
      `,
    });

    let server = project.startLanguageServer();
    let folds = server.getFoldingRanges(project.fileURI('example.ts'));

    expect(folds).toEqual([
      {
        startLine: 0,
        endLine: 2,
        kind: 'imports',
      },
    ]);
  });

  test('comments', () => {
    project.write({
      'example.ts': stripIndent`
        // This is
        // a
        // multiline
        // comment

        const foo = 'bar';
      `,
    });

    let server = project.startLanguageServer();
    let folds = server.getFoldingRanges(project.fileURI('example.ts'));

    expect(folds).toEqual([
      {
        startLine: 0,
        endLine: 3,
        kind: 'comment',
      },
    ]);
  });

  test('region', () => {
    project.write({
      'example.ts': stripIndent`
        const foo = 'bar';

        // #region

        const bar = 'baz';

        // #endregion

        export default { foo, bar };
      `,
    });

    let server = project.startLanguageServer();
    let folds = server.getFoldingRanges(project.fileURI('example.ts'));

    expect(folds).toEqual([
      {
        startLine: 2,
        endLine: 6,
        kind: 'region',
      },
    ]);
  });

  test('simple component', () => {
    project.write({
      'example.ts': stripIndent`
        import Component, { hbs } from '@glimmerx/component';
        import { tracked } from '@glimmer/tracking';

        export interface EmberComponentArgs {
          message: string;
        }

        export interface EmberComponentSignature {
          Element: HTMLDivElement;
          Args: EmberComponentArgs;
        }

        /**
         * A simple component that renders a message.
         */
        export default class Greeting extends Component<EmberComponentSignature> {
          @tracked message = this.args.message;

          get capitalizedMessage() {
            return this.message.toUpperCase();
          }
        }

        declare module '@glint/environment-ember-loose/registry' {
          export default interface Registry {
            EmberComponent: typeof EmberComponent;
            'ember-component': typeof EmberComponent;
          }
        }
      `,
    });

    let server = project.startLanguageServer();
    let folds = server.getFoldingRanges(project.fileURI('example.ts'));

    expect(folds).toEqual([
      // Imports
      {
        startLine: 0,
        endLine: 1,
        kind: 'imports',
      },

      // EmberComponentArgs
      {
        startLine: 3,
        endLine: 4,
        kind: undefined,
      },

      // EmberComponentSignature
      {
        startLine: 7,
        endLine: 9,
        kind: undefined,
      },

      // Code Comment
      {
        startLine: 12,
        endLine: 14,
        kind: 'comment',
      },

      // Greeting Component
      {
        startLine: 15,
        endLine: 20,
        kind: undefined,
      },

      // capitalizedMessage
      {
        startLine: 18,
        endLine: 19,
        kind: undefined,
      },

      // declare module
      {
        startLine: 23,
        endLine: 27,
        kind: undefined,
      },

      // interface Registry
      {
        startLine: 24,
        endLine: 26,
        kind: undefined,
      },
    ]);
  });
});
