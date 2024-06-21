import { stripIndent } from 'common-tags';
import ora, { Ora } from 'ora';
import { Project } from 'glint-monorepo-test-utils';

import { afterEach, beforeEach, describe, test, expect } from 'vitest';
import { autoNocheck } from '../src/lib/_auto-nocheck.js';

describe.skip('auto-nocheck', () => {
  let spinner!: Ora;
  let project!: Project;
  beforeEach(async () => {
    spinner = ora({ isSilent: true });
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('standalone template files', async () => {
    project.setGlintConfig({ environment: 'ember-loose' });

    let files = {
      'app/components/good.ts': stripIndent`
        import Component from '@glimmer/component';

        export default class Good extends Component {
          target = 'World';
        }
      `,
      'app/components/good.hbs': stripIndent`
        <p>
          Hello, {{this.target}}!
        </p>
      `,
      'app/components/bad.hbs': stripIndent`
        <p>
          Hello, {{this.target}}!
        </p>
      `,
    };

    project.write(files);

    await autoNocheck(['app/**/*.{ts,hbs}'], { spinner, cwd: project.filePath('.') });

    expect(project.read('app/components/good.hbs')).toEqual(files['app/components/good.hbs']);
    expect(project.read('app/components/bad.hbs')).toEqual(
      `{{! @glint-nocheck: not typesafe yet }}\n${files['app/components/bad.hbs']}`,
    );
  });

  test('embedded template files', async () => {
    project.setGlintConfig({ environment: 'ember-loose' });

    let files = {
      'tests/integration/good-test.ts': stripIndent`
        import { render } from '@ember/test-helpers';
        import { hbs } from 'ember-cli-htmlbars';

        async function goodTest() {
          await render<{ target: string }>(hbs\`
            Hello, {{this.target}}!
          \`);
        }
      `,
      'tests/integration/bad-test.ts': stripIndent`
        import { render } from '@ember/test-helpers';
        import { hbs } from 'ember-cli-htmlbars';

        async function badTest() {
          await render<{}>(hbs\`
            Hello, {{this.target}}!
          \`);
        }
      `,
      'tests/integration/one-liner-test.ts': stripIndent`
        import { render } from '@ember/test-helpers';
        import { hbs } from 'ember-cli-htmlbars';

        async function oneLinerTest() {
          await render<{}>(hbs\`Hello, {{this.target}}!\`);
        }
      `,
    };

    project.write(files);

    await autoNocheck(['tests/**/*.ts'], { spinner, cwd: project.filePath('.') });

    expect(project.read('tests/integration/good-test.ts')).toEqual(
      files['tests/integration/good-test.ts'],
    );

    let badTest = files['tests/integration/bad-test.ts'];
    let badTestInsertionIndex = badTest.indexOf('Hello,');
    expect(project.read('tests/integration/bad-test.ts')).toEqual(
      `${badTest.slice(
        0,
        badTestInsertionIndex,
      )}{{! @glint-nocheck: not typesafe yet }}\n    ${badTest.slice(badTestInsertionIndex)}`,
    );

    let oneLinerTest = files['tests/integration/one-liner-test.ts'];
    let oneLinerTestInsertionIndex = oneLinerTest.indexOf('Hello,');
    expect(project.read('tests/integration/one-liner-test.ts')).toEqual(
      `${oneLinerTest.slice(
        0,
        oneLinerTestInsertionIndex,
      )}{{! @glint-nocheck }}${oneLinerTest.slice(oneLinerTestInsertionIndex)}`,
    );
  });

  test('<template> templates', async () => {
    project.setGlintConfig({ environment: ['ember-loose', 'ember-template-imports'] });

    let files = {
      'app/components/good.gts': stripIndent`
        import Component from '@glimmer/component';

        export default class Good extends Component {
          target = 'World';

          <template>
            Hello, {{this.target}}!
          </template>
        }
      `,
      'app/components/bad.gts': stripIndent`
        import Component from '@glimmer/component';

        export default class Bad extends Component {
          <template>
            Hello, {{this.target}}!
          </template>
        }
      `,
      'app/components/one-liner.gts': stripIndent`
        import Component from '@glimmer/component';

        export default class OneLiner extends Component {
          <template>Hello, {{this.target}}!</template>
        }
      `,
    };

    project.write(files);

    await autoNocheck(['app/**/*.gts'], { spinner, cwd: project.filePath('.') });

    expect(project.read('app/components/good.gts')).toEqual(files['app/components/good.gts']);

    let bad = files['app/components/bad.gts'];
    let badInsertionIndex = bad.indexOf('Hello,');
    expect(project.read('app/components/bad.gts')).toEqual(
      `${bad.slice(0, badInsertionIndex)}{{! @glint-nocheck: not typesafe yet }}\n    ${bad.slice(
        badInsertionIndex,
      )}`,
    );

    let oneLiner = files['app/components/one-liner.gts'];
    let oneLinerInsertionIndex = oneLiner.indexOf('Hello,');
    expect(project.read('app/components/one-liner.gts')).toEqual(
      `${oneLiner.slice(0, oneLinerInsertionIndex)}{{! @glint-nocheck }}${oneLiner.slice(
        oneLinerInsertionIndex,
      )}`,
    );
  });

  test('custom explanation', async () => {
    project.setGlintConfig({ environment: 'ember-loose' });

    let files = {
      'app/components/bad.hbs': stripIndent`
        <p>
          Hello, {{this.target}}!
        </p>
      `,
    };

    project.write(files);

    await autoNocheck(['app/**/*.hbs', '--explanation', 'old and crufty'], {
      spinner,
      cwd: project.filePath('.'),
    });

    expect(project.read('app/components/bad.hbs')).toEqual(
      `{{! @glint-nocheck: old and crufty }}\n${files['app/components/bad.hbs']}`,
    );
  });
});
