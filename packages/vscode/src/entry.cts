import type { ExtensionContext } from 'vscode';

// Code requires a CJS entrypoint for extensions, but we can easily forward
// the `activate` and `deactivate` calls along.

const extension = import('./extension.js');

export async function activate(context: ExtensionContext): Promise<void> {
  return (await extension).activate(context);
}

export async function deactivate(): Promise<void> {
  return (await extension).deactivate();
}
