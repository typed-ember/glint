import { DirectInvokable, EmptyObject } from '@glint/template/-private/integration';

export type ModifierHelper = DirectInvokable<{
    <T extends keyof Registry>(args: EmptyObject, value: T): T extends keyof Registry ? Registry[T] : never
  }>;
