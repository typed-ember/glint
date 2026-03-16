import type { TOC } from '@ember/component/template-only'

export interface GreetingSignature {
  Element: HTMLDivElement
  Args: {
    message: string
    target: string
  };
  Blocks: { default: [] }
}

<template>
  <div ...attributes>{{@message}}, {{@target}}! {{yield}}</div>
</template> satisfies TOC<GreetingSignature>

