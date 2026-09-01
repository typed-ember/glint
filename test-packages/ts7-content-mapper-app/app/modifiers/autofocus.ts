import { modifier } from 'ember-modifier';

export const autofocus = modifier((element: HTMLElement) => {
  element.focus();
});
