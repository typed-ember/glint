import {
  FORM_COLLECTION_MEMBERS,
  FORM_CONTROL_TAGS,
} from '@glint/ember-tsc/transform/template/template-to-typescript';
import { expectTypeOf } from 'expect-type';

// The listed elements are the ones lib.dom gives the constraint validation API.
type ListedTag = {
  [K in keyof HTMLElementTagNameMap]: HTMLElementTagNameMap[K] extends {
    willValidate: boolean;
    form: HTMLFormElement | null;
  }
    ? K
    : never;
}[keyof HTMLElementTagNameMap];

expectTypeOf<(typeof FORM_CONTROL_TAGS)[number]>().toEqualTypeOf<ListedTag>();

expectTypeOf<(typeof FORM_COLLECTION_MEMBERS)[number]>().toEqualTypeOf<
  Exclude<keyof HTMLFormControlsCollection, number | symbol>
>();
