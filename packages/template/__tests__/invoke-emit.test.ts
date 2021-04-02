import { SafeString } from '@glimmer/runtime';
import { htmlSafe } from '@ember/template';
import { invokeEmit } from '../-private/dsl';

// Glimmer's SafeString interface
let safeString: SafeString = {
  toHTML(): string {
    return '<span>Foo</span>';
  },
};

invokeEmit(safeString);

// @ember/template's SafeString
invokeEmit(htmlSafe('<span>Foo</span>'));

// Emitting an HTML element inserts that element into the DOM
invokeEmit(document.createElement('div'));
invokeEmit(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
