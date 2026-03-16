import type { TOC } from '@ember/component/template-only'

/** A template-only greeting component. */
export interface GreetingSignature {
  Element: HTMLDivElement
  Args: {
    /** The greeting text */
    message: string
    /** Who to greet */
    target: string
    /** @deprecated Use message instead */
    legacyMessage?: string
  };
  Blocks: { default: [] }
}

<template>
  <div ...attributes>{{@message}}, {{@target}}! {{yield}}</div>
</template> satisfies TOC<GreetingSignature>
