import chalk from 'chalk';
import { execa } from 'execa';
import { mkdirp } from 'mkdirp';
import { rimraf } from 'rimraf';

import { packages } from './packages.mjs';

const dist = new URL('../dist', import.meta.url).pathname;
const pkgs = packages('@glint');

await mkdirp(dist);
await rimraf(dist + '/*.tgz', { glob: true });

const pack = pkgs.map(async (pkg) => {
  try {
    await execa('pnpm', ['pack', '--pack-destination', dist], {
      cwd: pkg.path,
    });

    console.log(chalk.green(`Successfully packed ${pkg.name}`));
  } catch (error) {
    let message = `Failed to pack ${pkg.name}`;

    if (error instanceof Error) {
      message += `\n\n${error.stack}`;
    }

    throw new Error(message);
  }
});

await Promise.all(pack);

console.log(
  chalk.green(`Successfully packed all packages. Ready for linking in external project.`),
);
