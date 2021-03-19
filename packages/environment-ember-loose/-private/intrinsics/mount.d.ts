import { DirectInvokable } from '@glint/template/-private/integration';

export type MountKeyword = DirectInvokable<{
  (args: { model?: unknown }, engine: string): void;
}>;
