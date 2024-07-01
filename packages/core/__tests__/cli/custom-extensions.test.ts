import * as os from 'node:os';
import { stripIndent } from 'common-tags';
import stripAnsi = require('strip-ansi');
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { Project } from 'glint-monorepo-test-utils';
import typescript from 'typescript';
import semver from 'semver';

describe.skip('CLI: custom extensions', () => {
  let project!: Project;
  beforeEach(async () => {
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('reporting one-shot diagnostics', async () => {
    let code = 'let identifier: string = 123;';

    project.setGlintConfig({ environment: 'ember-template-imports' });
    project.write('index.gts', code);

    let result = await project.check({ reject: false });

    expect(result.exitCode).toBe(1);
    expect(stripAnsi(result.stderr)).toMatchInlineSnapshot(`
      "index.gts:1:5 - error TS2322: Type 'number' is not assignable to type 'string'.

      1 let identifier: string = 123;
            ~~~~~~~~~~
      "
    `);
  });

  test('reporting watched diagnostics', async () => {
    let code = 'let identifier: string = 123;';

    project.setGlintConfig({ environment: 'ember-template-imports' });
    project.write('index.gts', code);

    let watch = project.checkWatch();
    let output = await watch.awaitOutput('Watching for file changes.');

    await watch.terminate();

    let stripped = stripAnsi(output);
    let error = stripped.slice(
      stripped.indexOf('index.gts'),
      stripped.lastIndexOf(`~~~${os.EOL}`) + 3,
    );

    expect(output).toMatch('Found 1 error.');
    expect(error.replace(/\r/g, '')).toMatchInlineSnapshot(`
      "index.gts:1:5 - error TS2322: Type 'number' is not assignable to type 'string'.

      1 let identifier: string = 123;
            ~~~~~~~~~~"
    `);
  });

  describe('external file changes', () => {
    beforeEach(() => {
      project.setGlintConfig({ environment: 'ember-template-imports' });
      project.write(
        'index.gts',
        stripIndent`
          import { foo } from "./other";
          console.log(foo - 1);
        `,
      );
    });

    test('adding a missing module', async () => {
      let watch = project.checkWatch();
      let output = await watch.awaitOutput('Watching for file changes.');

      expect(output).toMatch('Found 1 error.');
      expect(output).toMatch(
        "Cannot find module './other' or its corresponding type declarations.",
      );

      project.write('other.gjs', 'export const foo = 123;');

      await watch.awaitOutput('Found 0 errors.');
      await watch.terminate();
    });

    test('changing an imported module', async () => {
      project.write('other.gjs', 'export const foo = 123;');

      let watch = project.checkWatch();
      let output = await watch.awaitOutput('Watching for file changes.');

      expect(output).toMatch('Found 0 errors.');

      project.write('other.gjs', 'export const foo = "hi";');
      output = await watch.awaitOutput('Watching for file changes.');

      expect(output).toMatch('Found 1 error.');
      expect(output).toMatch('TS2362');

      await watch.terminate();
    });

    test('removing an imported module', async () => {
      project.write('other.gjs', 'export const foo = 123;');

      let watch = project.checkWatch();
      let output = await watch.awaitOutput('Watching for file changes.');

      expect(output).toMatch('Found 0 errors.');

      project.remove('other.gjs');
      output = await watch.awaitOutput('Watching for file changes.');

      expect(output).toMatch('Found 1 error.');
      expect(output).toMatch(
        "Cannot find module './other' or its corresponding type declarations.",
      );

      await watch.terminate();
    });
  });

  describe('module resolution with explicit extensions', () => {
    beforeEach(() => {
      project.setGlintConfig({ environment: 'ember-template-imports' });
      project.write({
        'index.gts': stripIndent`
          import Greeting from './Greeting.gts';
          <template><Greeting /></template>
        `,
        'Greeting.gts': stripIndent`
          <template>Hello!</template>
        `,
      });
    });

    test('is illegal by default', async () => {
      let result = await project.check({ reject: false });

      expect(result.exitCode).toBe(1);
      expect(stripAnsi(result.stderr)).toMatchInlineSnapshot(`
        "index.gts:1:22 - error TS2307: Cannot find module './Greeting.gts' or its corresponding type declarations.

        1 import Greeting from './Greeting.gts';
                               ~~~~~~~~~~~~~~~~
        "
      `);
    });

    test.runIf(semver.gte(typescript.version, '5.0.0'))(
      'works with `allowImportingTsExtensions: true`',
      async () => {
        project.updateTsconfig((config) => {
          config.compilerOptions ??= {};
          config.compilerOptions['allowImportingTsExtensions'] = true;
        });

        let result = await project.check();

        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe('');
      },
    );
  });
});
