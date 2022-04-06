import Ember from 'ember';
import '@glint/environment-ember-loose';
import '@glint/environment-ember-loose/native-integration';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Array<T> extends Ember.ArrayPrototypeExtensions<T> {}
  // interface Function extends Ember.FunctionPrototypeExtensions {}
}

export {};
