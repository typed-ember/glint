import yargs from 'yargs';
import { loadConfig } from '@glint/config';
import { performWatch } from './perform-watch';
import { performCheck } from './perform-check';
import { determineOptionsToExtend } from './options';
import { performBuild } from './perform-build';
import type TS from 'typescript';
import { performBuildWatch } from './perform-build-watch';

const argv = yargs
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
  // Use a 'default command' as a hack to get top-level positional arguments.
  // See https://github.com/yargs/yargs/blob/main/docs/advanced.md#default-commands
  .command('$0', false, (commandYargs) => {
    commandYargs.positional('projects', {
      description: 'A list of projects to compile, when using --build',
      type: 'string',
      array: true,
    });
  })
  .option('debug-intermediate-representation', {
    boolean: false,
    description: `When true, writes out a Glint's internal intermediate representation of each file within a GLINT_DEBUG subdirectory of the current working directory. This is intended for debugging Glint itself.`,
  })
  .wrap(100)
  .strict()
  .parseSync();

const glintConfig = loadConfig(argv.project ?? process.cwd());

if (argv['debug-intermediate-representation']) {
  const fs = require('fs');
  const path = require('path');
  (globalThis as any).GLINT_DEBUG_IR = function (filename: string, content: string) {
    let target = path.join('GLINT_DEBUG', path.relative(glintConfig.rootDir, filename));
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
    incremental: argv.incremental,
  };

  // This continues using the hack of a 'default command' to get the projects
  // specified (if any).
  let projectsArg = argv._;
  let projects = projectsArg.length > 0 ? projectsArg : ['.'];

  if (argv.watch) {
    performBuildWatch(glintConfig, projects, buildOptions);
  } else {
    performBuild(glintConfig, projects, buildOptions);
  }
}

const optionsToExtend = determineOptionsToExtend(argv);
if (argv.watch) {
  performWatch(glintConfig, optionsToExtend);
} else {
  performCheck(glintConfig, optionsToExtend);
}
