import { readFileSync } from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { execa } from 'execa';
import { glob } from 'glob';
import assert from 'node:assert';

const rootDir = new URL('..', import.meta.url).pathname;

const CWD = process.cwd();

assert(
  CWD !== rootDir,
  `Cannot run link-install from the glint monorepo. Must be ran from an external project`,
);

const packageJsonPaths = glob
  .sync('**/package.json', {
    cwd: CWD,
    ignore: '**/node_modules/**',
  })
  .filter(
    (x) => !x.includes('unstable-release') && !x.includes('test-packages') && !x.includes('vscode'),
  );

function shouldLink(dep) {
  return dep.startsWith('@glint/');
}

const link = packageJsonPaths.map(async (packageJsonPath) => {
  const packagePath = path.dirname(packageJsonPath);

  try {
    const packageJson = JSON.parse(await readFileSync(packageJsonPath, { encoding: 'utf8' }));

    const friendlyCWD = CWD.replace(process.env.HOME, '~');
    const friendlyRoot = rootDir.replace(process.env.HOME, '~');
    console.log(`Gathering packages from ${chalk.gray(friendlyRoot)}`);

    for (const [dep] of [
      ...Object.entries(packageJson.dependencies ?? {}),
      ...Object.entries(packageJson.devDependencies ?? {}),
    ]) {
      if (shouldLink(dep)) {
        // eslint-disable-next-line no-console
        console.log(`Linking ${chalk.yellow(dep)} within ${chalk.grey(friendlyCWD)}`);
        await execa('pnpm', ['link', '--global', dep], { cwd: packagePath });
      }
    }
  } catch (error) {
    let message = `Failed to link ${packagePath}`;

    if (error instanceof Error) {
      message += `\n\n${error.stack}`;
    }

    throw new Error(message);
  }
});

await Promise.all(link);
