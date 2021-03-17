import * as glimmerxModifier from '@glimmerx/modifier';

export * from '@glimmerx/modifier';

import type { CreatesModifier } from '@glint/template/-private';
import type { DirectInvokable } from '@glint/template/-private/resolution';
import type { EmptyObject } from '@glint/template/-private/signature';

type OnModifier = DirectInvokable<
  <Name extends keyof HTMLElementEventMap>(
    args: EmptyObject,
    name: Name,
    callback: (event: HTMLElementEventMap[Name]) => void
  ) => CreatesModifier<HTMLElement>
>;

export const on = (glimmerxModifier.on as unknown) as OnModifier;
