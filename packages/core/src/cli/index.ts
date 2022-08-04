import yargs from 'yargs';
import { loadConfig } from '@glint/config';
import { performWatch } from './perform-watch';
import { performCheck } from './perform-check';
import { determineOptionsToExtend } from './options';

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
  .option('debug-intermediate-representation', {
    boolean: false,
    description: `When true, writes out a Glint's internal intermediate representation of each file within a GLINT_DEBUG subdirectory of the current working directory. This is intended for debugging Glint itself.`,
  })
  .wrap(100)
  .strict()
  .parseSync();

const glintConfig = loadConfig(argv.project ?? process.cwd());
const optionsToExtend = determineOptionsToExtend(argv);

if (argv['debug-intermediate-representation']) {
  const fs = require('fs');
  const path = require('path');
  (globalThis as any).GLINT_DEBUG_IR = function (filename: string, content: string) {
    let target = path.join('GLINT_DEBUG', path.relative(glintConfig.rootDir, filename));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
}

if (argv.watch) {
  performWatch(glintConfig, optionsToExtend);
} else {
  performCheck(glintConfig, optionsToExtend);
}
