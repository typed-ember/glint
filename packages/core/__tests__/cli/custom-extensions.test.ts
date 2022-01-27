import { stripIndent } from 'common-tags';
import stripAnsi from 'strip-ansi';
import os from 'os';
import Project from '../utils/project';

describe('CLI: custom extensions', () => {
  let project!: Project;
  beforeEach(async () => {
    jest.setTimeout(20_000);
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('reporting one-shot diagnostics', async () => {
    let code = 'let identifier: string = 123;';

    project.write('.glintrc', 'environment: custom-test');
    project.write('index.custom', code);

    let result = await project.check({ reject: false });

    expect(result.exitCode).toBe(1);
    expect(stripAnsi(result.stderr)).toMatchInlineSnapshot(`
      "index.custom:1:5 - error TS2322: Type 'number' is not assignable to type 'string'.

      1 let identifier: string = 123;
            ~~~~~~~~~~
      "
    `);
  });

  test('reporting watched diagnostics', async () => {
    let code = 'let identifier: string = 123;';

    project.write('.glintrc', 'environment: custom-test');
    project.write('index.custom', code);

    let watch = project.watch();
    let output = await watch.awaitOutput('Watching for file changes.');

    await watch.terminate();

    let stripped = stripAnsi(output);
    let error = stripped.slice(
      stripped.indexOf('index.custom'),
      stripped.lastIndexOf(`~~~${os.EOL}`) + 3
    );

    expect(output).toMatch('Found 1 error.');
    expect(error.replace(/\r/g, '')).toMatchInlineSnapshot(`
      "index.custom:1:5 - error TS2322: Type 'number' is not assignable to type 'string'.

      1 let identifier: string = 123;
            ~~~~~~~~~~"
    `);
  });

  describe('external file changes', () => {
    beforeEach(() => {
      project.write('.glintrc', `environment: custom-test`);
      project.write(
        'index.custom',
        stripIndent`
          import { foo } from "./other";
          console.log(foo - 1);
        `
      );
    });

    test('adding a missing module', async () => {
      let watch = project.watch();
      let output = await watch.awaitOutput('Watching for file changes.');

      expect(output).toMatch('Found 1 error.');
      expect(output).toMatch(
        "Cannot find module './other' or its corresponding type declarations."
      );

      project.write('other.custom', 'export const foo = 123;');

      await watch.awaitOutput('Found 0 errors.');
      await watch.terminate();
    });

    test('changing an imported module', async () => {
      project.write('other.custom', 'export const foo = 123;');

      let watch = project.watch();
      let output = await watch.awaitOutput('Watching for file changes.');

      expect(output).toMatch('Found 0 errors.');

      project.write('other.custom', 'export const foo = "hi";');
      output = await watch.awaitOutput('Watching for file changes.');

      expect(output).toMatch('Found 1 error.');
      expect(output).toMatch('TS2362');

      await watch.terminate();
    });

    test('removing an imported module', async () => {
      project.write('other.custom', 'export const foo = 123;');

      let watch = project.watch();
      let output = await watch.awaitOutput('Watching for file changes.');

      expect(output).toMatch('Found 0 errors.');

      project.remove('other.custom');
      output = await watch.awaitOutput('Watching for file changes.');

      expect(output).toMatch('Found 1 error.');
      expect(output).toMatch(
        "Cannot find module './other' or its corresponding type declarations."
      );

      await watch.terminate();
    });
  });
});
