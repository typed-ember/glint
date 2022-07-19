#!/usr/bin/env node

// Scripts presently only work as CommonJS *or* with some wrapper. Here, just
// write it as CJS.
(async function () {
  const { migrate } = await import('./lib/_migrate-glintrc.js');

  let { successes, failures } = await migrate(process.argv.slice(2));
  for (let success of successes) {
    console.log(success);
  }

  for (let failure of failures) {
    console.error(failure);
  }

  let exitCode = successes.length > 0 && failures.length === 0 ? 0 : 1;
  process.exit(exitCode);
})();
