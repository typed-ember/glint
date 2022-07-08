import { TOC } from '@ember/component/template-only';

const lib = {
  MaybeComponent: undefined as TOC<{ Args: { arg: string } }> | undefined
};

<template>
  <lib.MaybeComponent @arg="hi" />

  {{! @glint-expect-error: missing arg }}
  <lib.MaybeComponent />
</template>
