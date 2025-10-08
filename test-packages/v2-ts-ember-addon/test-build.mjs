import { $ } from 'execa';

let options = { stdio: 'inherit' };

await $(options)`pnpm build`;

let { stdout } = await $({ ...options, cwd: 'dist' })`ag "\.gts" --stots-only`;

if (stdout.match(/^0 matches/)) {
  console.log(
    '.gts extensions did not leak in to the output and were successfully converted',
  );
} else {
  console.error(
    `.gts extensions detected in the output means that we generated declarations incorrectly.`,
  );
  process.exit(1);
}
