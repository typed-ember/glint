import { existsSync, statSync } from 'fs';

import { stripIndent } from 'common-tags';
import { beforeEach, describe, expect, test } from 'vitest';

import Project from '../utils/project';

const BUILD_INFO = 'tsconfig.tsbuildinfo';
const INPUT_SCRIPT = 'index.ts';

describe('CLI: --incremental', () => {
  test('when no build has occurred', async () => {
    let project = await Project.create();

    let code = stripIndent`
      import '@glint/environment-ember-template-imports';
      import Component from '@glimmer/component';
      import { hbs } from 'ember-template-imports';

      type ApplicationArgs = {
        version: string;
      };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        public static template = hbs\`
          Welcome to app v{{@version}}.
          The current time is {{this.startupTime}}.
        \`;
      }
    `;

    project.write(INPUT_SCRIPT, code);

    let checkResult = await project.build({ flags: ['--incremental'] });

    expect(checkResult.exitCode).toBe(0);
    expect(checkResult.stdout).toEqual('');
    expect(checkResult.stderr).toEqual('');
    expect(existsSync(project.filePath(BUILD_INFO))).toBe(true);
  });

  describe('when a build has occurred', () => {
    let project!: Project;
    beforeEach(async () => {
      project = await Project.create();

      let code = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';
        import { hbs } from 'ember-template-imports';
  
        type ApplicationArgs = {
          version: string;
        };
  
        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();
  
          public static template = hbs\`
            Welcome to app v{{@version}}.
            The current time is {{this.startupTime}}.
          \`;
        }
      `;

      project.write(INPUT_SCRIPT, code);

      await project.build({ flags: ['--incremental'] });
    });

    test('and there are no changes', async () => {
      let firstStat = statSync(project.filePath(BUILD_INFO));

      let checkResult = await project.build({ flags: ['--incremental'] });

      // This should succeed again...
      expect(checkResult.exitCode).toBe(0);
      expect(checkResult.stdout).toEqual('');
      expect(checkResult.stderr).toEqual('');

      // ...without needing to update the build info.
      let secondStat = statSync(project.filePath(BUILD_INFO));
      expect(firstStat.mtime).toEqual(secondStat.mtime);
    });

    test('and there are changes', async () => {
      let firstStat = statSync(project.filePath(BUILD_INFO));

      let code = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';
        import { hbs } from 'ember-template-imports';
  
        type ApplicationArgs = {
          appVersion: string;
        };
  
        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();
  
          public static template = hbs\`
            Welcome to app v{{@appVersion}}.
            The current time is {{this.startupTime}}.
          \`;
        }
      `;

      project.write(INPUT_SCRIPT, code);

      let checkResult = await project.build({ flags: ['--incremental'] });

      // This should succeed again...
      expect(checkResult.exitCode).toBe(0);
      expect(checkResult.stdout).toEqual('');
      expect(checkResult.stderr).toEqual('');

      // ...but the build info should be updated.
      let secondStat = statSync(project.filePath(BUILD_INFO));
      expect(firstStat.mtimeMs).toBeLessThan(secondStat.mtimeMs);
    });
  });
});
