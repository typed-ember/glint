import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { glob } from 'glob';
import assert from 'node:assert';

const rootDir = new URL('..', import.meta.url).pathname;
const CWD = process.cwd();

const friendlyCWD = CWD.replace(process.env.HOME, '~');
const friendlyRoot = rootDir.replace(process.env.HOME, '~');

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

const tars = glob.sync('*.tgz', {
  cwd: path.join(rootDir, 'dist'),
});

console.log(tars);

const link = packageJsonPaths.map(async (packageJsonPath) => {
  const packagePath = path.dirname(packageJsonPath);

  try {
    const packageJson = JSON.parse(await readFileSync(packageJsonPath, { encoding: 'utf8' }));

    console.log(`Gathering packages from ${chalk.gray(friendlyRoot)}`);

    for (const [dep] of [
      ...Object.entries(packageJson.dependencies ?? {}),
      ...Object.entries(packageJson.devDependencies ?? {}),
    ]) {
      if (shouldLink(dep)) {
        let tarified = dep.replace('@', '').replace('/', '-');
        let tar = tars.find((x) => x.startsWith(tarified));

        if (!tar) {
          console.warn(`Could not find mapping to ${dep} from ${packagePath} using ${tarified}`);
          continue;
        }

        let tarPath = path.join(rootDir, 'dist', tar);
        let relativeTarPath = path.relative(packagePath, tarPath);

        // eslint-disable-next-line no-console
        console.log(
          `Linking ${chalk.yellow(dep)} within ${chalk.grey(friendlyCWD)} to ${chalk.green(relativeTarPath)}`,
        );

        packageJson.pnpm ||= {};
        packageJson.pnpm.overrides ||= {};
        Object.assign(packageJson.pnpm.overrides, {});
      }
    }

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  } catch (error) {
    let message = `Failed to link ${packagePath}`;

    if (error instanceof Error) {
      message += `\n\n${error.stack}`;
    }

    throw new Error(message);
  }
});

await Promise.all(link);
