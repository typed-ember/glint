
const handler = (event: MouseEvent): void => {
  void event;
};

const greetOnClick = (name: string, event: MouseEvent): void => {
  void name;
  void event;
};

const greet = (name: string, exclamation: string): string =>
  `Hello, ${name}${exclamation}`;
void greet;

<template>
  {{! ---- (RFC 470) fn helper---- }}
  <button {{on "click" (fn greetOnClick "world")}} type="button">noop</button>

  {{! @glint-expect-error -- binds a two-string function where the bound value must be a MouseEvent.
      This mismatch used to be silently swallowed when the fn call sat inside another call's
      arguments; the bind-positional emit surfaces it. (#1147) }}
  <button {{on "click" (fn handler greet)}} type="button">noop</button>

  {{! @glint-expect-error -- requires two arguments}}
  <button {{on "click" (fn)}} type="button">noop</button>

  {{! @glint-expect-error - fn does not return a ContentValue}}
  {{fn handler}}
</template>
