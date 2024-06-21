import { existsSync, statSync, readFileSync } from 'fs';

import { stripIndent } from 'common-tags';
import { beforeEach, describe, expect, test } from 'vitest';

import { Project } from 'glint-monorepo-test-utils';

const BUILD_INFO = 'tsconfig.tsbuildinfo';
const INPUT_SCRIPT = 'index.gts';

describe.skip('CLI: --incremental', () => {
  test('when no build has occurred', async () => {
    let project = await Project.create({ glint: { environment: 'ember-template-imports' } });

    let code = stripIndent`
      import '@glint/environment-ember-template-imports';
      import Component from '@glimmer/component';

      type ApplicationArgs = {
        version: string;
      };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        <template>
          Welcome to app v{{@version}}.
          The current time is {{this.startupTime}}.
        </template>
      }
    `;

    project.write(INPUT_SCRIPT, code);

    let checkResult = await project.check({ flags: ['--incremental'] });

    expect(checkResult.exitCode).toBe(0);
    expect(checkResult.stdout).toEqual('');
    expect(checkResult.stderr).toEqual('');

    expect(existsSync(project.filePath(BUILD_INFO))).toBe(true);
    let contents = JSON.parse(readFileSync(project.filePath(BUILD_INFO), { encoding: 'utf-8' }));
    expect(contents).toHaveProperty('program');
    expect(contents.program).toHaveProperty('fileNames');
    expect(contents.program.fileNames.length).not.toEqual(0);
  });

  describe('when a build has occurred', () => {
    let project!: Project;
    beforeEach(async () => {
      project = await Project.create({ glint: { environment: 'ember-template-imports' } });

      let code = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';

        type ApplicationArgs = {
          version: string;
        };

        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();

          <template>
            Welcome to app v{{@version}}.
            The current time is {{this.startupTime}}.
          </template>
        }
      `;

      project.write(INPUT_SCRIPT, code);

      await project.check({ flags: ['--incremental'] });
    });

    test('and there are no changes', async () => {
      let firstStat = statSync(project.filePath(BUILD_INFO));

      let checkResult = await project.check({ flags: ['--incremental'] });

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

        type ApplicationArgs = {
          appVersion: string;
        };

        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();

          <template>
            Welcome to app v{{@appVersion}}.
            The current time is {{this.startupTime}}.
          </template>
        }
      `;

      project.write(INPUT_SCRIPT, code);

      let checkResult = await project.check({ flags: ['--incremental'] });

      // This should succeed again...
      expect(checkResult.exitCode).toBe(0);
      expect(checkResult.stdout).toEqual('');
      expect(checkResult.stderr).toEqual('');

      // ...but the build info should be updated.
      let secondStat = statSync(project.filePath(BUILD_INFO));
      expect(firstStat.mtimeMs).toBeLessThan(secondStat.mtimeMs);
    });
  });

  describe('when specified in tsconfig.json', () => {
    let project!: Project;
    beforeEach(async () => {
      project = await Project.create({ compilerOptions: { incremental: true } });

      let code = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';
  
        type ApplicationArgs = {
          version: string;
        };
  
        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();
  
          <template>
            Welcome to app v{{@version}}.
            The current time is {{this.startupTime}}.
          </template>
        }
      `;

      project.write(INPUT_SCRIPT, code);

      await project.check();
    });

    test('it honors the config', async () => {
      let firstStat = statSync(project.filePath(BUILD_INFO));

      let checkResult = await project.check();

      // This should succeed again...
      expect(checkResult.exitCode).toBe(0);
      expect(checkResult.stdout).toEqual('');
      expect(checkResult.stderr).toEqual('');

      // ...without needing to update the build info.
      let secondStat = statSync(project.filePath(BUILD_INFO));
      expect(firstStat.mtime).toEqual(secondStat.mtime);
    });
  });
});
