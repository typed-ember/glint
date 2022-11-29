import { createRequire } from 'node:module';
import yargs from 'yargs';
import { findTypeScript, loadConfig } from '../config/index.js';
import { performWatch } from './perform-watch.js';
import { performCheck } from './perform-check.js';
import { determineOptionsToExtend } from './options.js';
import { performBuild } from './perform-build.js';
import type * as TS from 'typescript';
import { performBuildWatch } from './perform-build-watch.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

const argv = yargs(process.argv.slice(2))
  .scriptName('glint')
  .usage('$0 [options]')
  .option('project', {
    alias: 'p',
    string: true,
    description: 'The path to the tsconfig file to use',
  })
  .option('watch', {
    alias: 'w',
    boolean: true,
    description: 'Whether to perform an ongoing watched build',
  })
  .option('declaration', {
    alias: 'd',
    boolean: true,
    description: 'Whether to emit declaration files',
  })
  .option('build', {
    alias: 'b',
    boolean: true,
    description:
      'Build one or more projects and their dependencies, if out of date. Same as the TS `--build` flag.',
    // As with TS itself, we *must* emit declarations when in build mode
    conflicts: 'declaration',
  })
  .option('clean', {
    implies: 'build',
    boolean: true,
    description: 'Delete the outputs of all projects.',
    conflicts: 'watch',
  })
  .option('force', {
    implies: 'build',
    description: 'Act as if all projects are out of date. Same as the TS `--force` flag.',
    type: 'boolean',
  })
  .option('dry', {
    implies: 'build',
    description: `Show what would be built (or deleted, if specified with '--clean'). Same as the TS \`--dry\` flag.`,
    type: 'boolean',
  })
  .option('incremental', {
    description:
      'Save .tsbuildinfo files to allow for incremental compilation of projects. Same as the TS `--incremental` flag.',
    type: 'boolean',
  })
  .option('debug-intermediate-representation', {
    boolean: false,
    description: `When true, writes out a Glint's internal intermediate representation of each file within a GLINT_DEBUG subdirectory of the current working directory. This is intended for debugging Glint itself.`,
  })
  .version(pkg.version)
  .wrap(100)
  .strict()
  .parseSync();

let cwd = process.cwd();

if (argv['debug-intermediate-representation']) {
  const fs = require('fs');
  const path = require('path');
  (globalThis as any).GLINT_DEBUG_IR = function (filename: string, content: string) {
    let target = path.join('GLINT_DEBUG', path.relative(cwd, filename));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
}

if (argv.build) {
  // Type signature here so we get a useful error as close to the source of the
  // error as possible, rather than at the *use* sites below.
  let buildOptions: TS.BuildOptions = {
    clean: argv.clean,
    force: argv.force,
    dry: argv.dry,
  };

  if ('incremental' in argv) {
    buildOptions.incremental = argv.incremental;
  }

  // Get the closest TS to us, since we have to assume that we may be in the
  // root of a project which has no `Glint` config *at all* in its root, but
  // which must have *some* TS to be useful.
  let ts = findTypeScript(cwd);
  if (!ts) {
    console.error('Could not find a local TypeScript');
    process.exit(1);
  }

  // This continues using the hack of a 'default command' to get the projects
  // specified (if any).
  let projects = [cwd];

  if (argv.watch) {
    performBuildWatch(ts, projects, buildOptions);
  } else {
    performBuild(ts, projects, buildOptions);
  }
} else {
  const glintConfig = loadConfig(argv.project ?? cwd);
  const optionsToExtend = determineOptionsToExtend(argv);
  if (argv.watch) {
    performWatch(glintConfig, optionsToExtend);
  } else {
    performCheck(glintConfig, optionsToExtend);
  }
}
