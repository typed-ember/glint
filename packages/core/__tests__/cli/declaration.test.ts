import { stripIndent } from 'common-tags';
import Project from '../utils/project';

describe('CLI: emitting declarations', () => {
  let project!: Project;
  beforeEach(async () => {
    jest.setTimeout(20_000);
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('emit for a valid project', async () => {
    let code = stripIndent`
      import { Component, hbs } from '@glint/environment-glimmerx';

      export interface ApplicationArgs {
        version: string;
      }

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        public static template = hbs\`
          Welcome to app v{{@version}}.
          The current time is {{this.startupTime}}.
        \`;
      }
    `;

    project.write('index.ts', code);

    let emitResult = await project.check({ flags: ['--declaration'] });

    expect(emitResult.exitCode).toBe(0);

    expect(project.read('index.d.ts')).toMatchInlineSnapshot(`
      "import { Component } from '@glint/environment-glimmerx';
      export interface ApplicationArgs {
          version: string;
      }
      export default class Application extends Component<{
          Args: ApplicationArgs;
      }> {
          private startupTime;
          static template: import(\\"@glint/environment-glimmerx/types\\").Template;
      }
      "
    `);
  });
});
