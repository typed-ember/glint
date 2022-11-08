import { relative, dirname } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import resolvePkg from 'resolve';
import globPkg from 'glob';
import yargs from 'yargs';
import ora from 'ora';
import { type ProjectAnalysis } from '@glint/core';

const globSync = globPkg.sync;
const resolve = resolvePkg.sync;

export async function autoNocheck(
  args: Array<string>,
  { cwd = process.cwd(), spinner = ora() } = {}
): Promise<void> {
  let glint = await loadGlintCore(cwd);
  let { globs, explanation } = parseArgs(args);

  spinner.start('Starting Glint language service...');

  let project = glint.analyzeProject(cwd);
  let fileUpdates = new Map<string, string>();

  for (let filePath of collectFilePaths(globs, cwd)) {
    spinner.text = `Checking ${relative(cwd, filePath)}...`;

    let fileContents = await readFile(filePath, 'utf-8');
    let templatesWithErrors = findTemplatesWithErrors(glint, filePath, fileContents, project);
    if (templatesWithErrors.size) {
      fileUpdates.set(
        filePath,
        insertNocheckComments(filePath, fileContents, explanation, templatesWithErrors)
      );
    }
  }

  project.shutdown();

  spinner.text = 'Writing `@glint-nocheck` comments...';

  await writeFileContents(fileUpdates);

  spinner.succeed(`Done! ${fileUpdates.size} files updated.`);
}

function parseArgs(args: Array<string>): { globs: Array<string>; explanation: string } {
  return yargs(args)
    .scriptName('auto-nocheck')
    .command('$0 <globs...>', 'Write a description here', (command) =>
      command
        .positional('globs', {
          type: 'string',
          array: true,
          describe: 'One or more paths or globs specifying the files to act on.',
          demandOption: true,
        })
        .option('explanation', {
          type: 'string',
          default: 'not typesafe yet',
          describe: 'The explanation to be included in @glint-nocheck comments',
        })
    )
    .wrap(100)
    .strict()
    .parseSync();
}

type GlintCore = typeof import('@glint/core');

function findImport(path: string, basedir: string): string {
  let resolvedPath = resolve(path, { basedir });
  let directory = dirname(fileURLToPath(import.meta.url));
  return relative(directory, resolvedPath);
}

// We want to use the project-local version of @glint/core for maximum compatibility,
// but we need to guard against older versions that don't expose a programmatic API.
async function loadGlintCore(cwd: string): Promise<GlintCore> {
  let glint: GlintCore | undefined;
  try {
    glint = await import(findImport('@glint/core', cwd));
  } catch (error) {
    console.log(error);
    // Fall through
  }

  if (!glint?.pathUtils) {
    throw new Error(
      'This script requires a recent version of @glint/core to run. ' +
        'Consider upgrading to the latest version of Glint or using ' +
        'an older version of @glint/scripts.'
    );
  }

  return glint;
}

function collectFilePaths(globs: Array<string>, cwd: string): Array<string> {
  return globs.flatMap((glob) => globSync(glob, { cwd, absolute: true }));
}

// For the given file path, returns all templates in that file that have
// type errors, mapped from their offset to their contents. (This shape
// is a little weird, but it conveniently deduplicates and gives us exactly
// the information we need.)
function findTemplatesWithErrors(
  glint: GlintCore,
  filePath: string,
  fileContents: string,
  project: ProjectAnalysis
): Map<number, string> {
  let templatesWithErrors = new Map<number, string>();
  let info = project.transformManager.findTransformInfoForOriginalFile(filePath);
  if (!info?.transformedModule) return templatesWithErrors;

  let { DiagnosticCategory } = project.glintConfig.ts;
  let diagnostics = project.languageServer.getDiagnostics(pathToFileURL(filePath).toString());
  let errors = diagnostics.filter((diagnostic) => diagnostic.severity === DiagnosticCategory.Error);

  for (let error of errors) {
    let originalStart = glint.pathUtils.positionToOffset(fileContents, error.range.start);
    let template = info.transformedModule.findTemplateAtOriginalOffset(filePath, originalStart);
    if (template) {
      templatesWithErrors.set(template.originalContentStart, template.originalContent);
    }
  }

  return templatesWithErrors;
}

// Given information about a file and the location of templates within it
// that have type errors, returns a version of that file's contents with
// appropriate `{{! @glint-nocheck }}` comments added.
function insertNocheckComments(
  filePath: string,
  fileContents: string,
  explanation: string,
  templatesWithErrors: Map<number, string>
): string {
  let chunks = [];
  let progress = 0;
  for (let [offset, template] of templatesWithErrors.entries()) {
    let isMultiline = /\n/.test(template) || filePath.endsWith('.hbs');
    let [leadingWhitespace, indentation] = /^\s*?\n(\s*)/.exec(template) ?? ['', ''];
    let insertAt = offset + leadingWhitespace.length;
    let toInsert = isMultiline
      ? `{{! @glint-nocheck: ${explanation} }}\n${indentation}`
      : '{{! @glint-nocheck }}';

    chunks.push(fileContents.slice(progress, insertAt));
    chunks.push(toInsert);

    progress = insertAt;
  }

  chunks.push(fileContents.slice(progress));

  return chunks.join('');
}

async function writeFileContents(fileUpdates: Map<string, string>): Promise<void> {
  for (let [path, contents] of fileUpdates.entries()) {
    await writeFile(path, contents);
  }
}
