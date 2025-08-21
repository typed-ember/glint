import { runTsc } from '@volar/typescript/lib/quickstart/runTsc.js';
import type { LanguagePlugin, URI } from '@volar/language-server';

/**
 * Helper function to run tsc with custom arguments while safely managing process.argv.
 * This encapsulates the process.argv mutation to avoid polluting global state.
 */
export function runTscWithArgs(
  tscPath: string,
  args: string[],
  options: any,
  createLanguagePlugin: () => LanguagePlugin<URI>[]
): void {
  const originalArgv = process.argv;
  try {
    process.argv = args;
    runTsc(tscPath, options, createLanguagePlugin);
  } finally {
    // Always restore original argv, even if runTsc throws
    process.argv = originalArgv;
  }
}
