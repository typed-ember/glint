import yargs from 'yargs';
import { performWatch } from './perform-watch';
import { performCheck } from './perform-check';
import { determineOptionsToExtend } from './options';
import { loadTypeScript } from './load-typescript';

const { argv } = yargs
  .scriptName('glint')
  .usage('$0 [options] [file...]')
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
  .wrap(100)
  .strict();

const ts = loadTypeScript();
const configPath = argv.project ?? ts.findConfigFile('.', ts.sys.fileExists);
const optionsToExtend = determineOptionsToExtend(argv);

if (argv.watch) {
  performWatch(ts, configPath, optionsToExtend);
} else {
  performCheck(ts, argv._, configPath, optionsToExtend);
}
