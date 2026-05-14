
const handler = (event: MouseEvent): void => {
  void event;
};

const greet = (name: string, exclamation: string): string =>
  `Hello, ${name}${exclamation}`;
void greet;

<template>
  {{! ---- (RFC 470) fn helper---- }}
  <button {{on "click" (fn handler greet)}} type="button">noop</button>

  {{! @glint-expect-error -- requires two arguments}}
  <button {{on "click" (fn)}} type="button">noop</button>

  {{! @glint-expect-error - fn does not return a ContentValue}}
  {{fn handler}}
</template>
