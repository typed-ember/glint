import { DirectInvokable } from '@glint/template/-private/resolution';

export type MountKeyword = DirectInvokable<{
  (args: { model?: unknown }, engine: string): void;
}>;
