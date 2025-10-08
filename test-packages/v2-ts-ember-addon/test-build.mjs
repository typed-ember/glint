import { $ } from 'execa';
import { existsSync } from 'node:fs';
import { glob, readFile } from 'node:fs/promises';

let errors = [];
let options = { stdio: 'inherit' };

await $(options)`pnpm build`;

console.log('Verifying build');

check(existsSync('dist'), `Expected dist directory to be created`);
check(
  existsSync('declarations'),
  `Expected declarations directory to be created`,
);

assertReady();

for await (const entry of glob('{dist,declarations}/**/*.{js,d.ts}')) {
  console.log(`Checking ${entry}`);
  let buffer = readFile(entry);
  let content = buffer.toString();

  let hasForbiddenExtensions = content.match(/\.gts/);

  check(
    !hasForbiddenExtensions,
    `Expected ${entry} to not have the .gts extension anywhere in the file`,
  );
}

assertDone();

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////

function check(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function showErrors() {
  for (let msg of errors) {
    console.error(msg);
  }
}

function assertReady() {
  if (errors.length === 0) {
    return;
  }

  showErrors();
  process.exit(1);
}

function assertDone() {
  assertReady();

  console.info(`No issues were found.`);
}
