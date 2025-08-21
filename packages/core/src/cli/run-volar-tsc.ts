import { runTsc } from '@volar/typescript/lib/quickstart/runTsc.js';
import { createEmberLanguagePlugin } from '../volar/ember-language-plugin.js';
import { findConfig, createTempConfigForFiles, findTypeScript } from '../config/index.js';

import { createRequire } from 'node:module';
import { LanguagePlugin, URI } from '@volar/language-server';
import { runTscWithArgs } from './utils.js';

const require = createRequire(import.meta.url);

export function run(): void {
  const cwd = process.cwd();
  const args = process.argv.slice(2);
  
  // Use TypeScript's built-in command line parser
  const ts = findTypeScript(cwd);

  if (!ts) {
    throw new Error('TypeScript not found. Glint requires TypeScript to be installed.');
  }
  
  const parsedCommandLine = ts.parseCommandLine(args);
  
  // Handle parsing errors
  if (parsedCommandLine.errors.length > 0) {
    parsedCommandLine.errors.forEach(error => {
      console.error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
    });
    process.exit(1);
  }
  
  const files = parsedCommandLine.fileNames;
  const compilerOptions = parsedCommandLine.options;
  const hasSpecificFiles = files.length > 0;

  const options = {
    extraSupportedExtensions: ['.gjs', '.gts'],

    extraExtensionsToRemove: [],

    // With the above configuration, `{basename}.gts` will produce `{basename}.gts.d.ts`.
    // If we would prefer `{basename}.d.ts`, we could use the following configuration instead:
    //
    // extraExtensionsToRemove: ['.gts', '.gjs'],
    //
    // See discussion here: https://github.com/typed-ember/glint/issues/628
  };

  const createLanguagePlugin = (): LanguagePlugin<URI>[] => {
    const glintConfig = findConfig(cwd);
    return glintConfig ? [createEmberLanguagePlugin(glintConfig)] : [];
  };

  if (hasSpecificFiles) {
    // For specific files, create temporary tsconfig that inherits from project config
    const { tempConfigPath, cleanup } = createTempConfigForFiles(cwd, files);
    
    try {
      // Build TypeScript arguments for single file checking
      const tscArgs = ['node', 'tsc', '--project', tempConfigPath];
      
      // Convert compiler options back to command line arguments
      // Skip conflicting options that we control
      const filteredOptions = { ...compilerOptions };
      delete filteredOptions.project;
      
      // Add --noEmit as default only if user hasn't specified emit-related flags
      const hasEmitFlag = Boolean(
        compilerOptions.noEmit ||
        compilerOptions.declaration ||
        compilerOptions.emitDeclarationOnly ||
        compilerOptions['build']
      );
      
      if (!hasEmitFlag) {
        filteredOptions.noEmit = true;
      }
      
      // Convert options back to command line format
      const compilerArgs = Object.entries(filteredOptions)
        .filter(([, value]) => value !== false && value !== undefined)
        .flatMap(([key, value]) => 
          value === true ? [`--${key}`] : [`--${key}`, String(value)]
        );
      
      tscArgs.push(...compilerArgs);
      
      runTscWithArgs(require.resolve('typescript/lib/tsc'), tscArgs, options, createLanguagePlugin);
    } finally {
      cleanup();
    }
  } else {
    runTsc(require.resolve('typescript/lib/tsc'), options, createLanguagePlugin);
  }
}
