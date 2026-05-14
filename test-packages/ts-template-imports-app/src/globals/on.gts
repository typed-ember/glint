const handler = (event: MouseEvent): void => {
  void event;
};

<template>
  {{! ---- (RFC 562) on modifier ---- }}
  <button {{on "click" handler}} type="button">click</button>

  {{! @glint-expect-error -- missing arg }}
  <button {{on "click"}} type="button">click</button>

  {{! @glint-expect-error -- no args}}
  <button {{on}} type="button">click</button>

  {{! @glint-expect-error -- used as value}}
  {{on}}

  {{! @glint-expect-error -- used as function}}
  {{(on 'click' handler)}}
</template>
