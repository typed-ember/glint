import { SafeString } from '@glimmer/runtime';
import { htmlSafe } from '@ember/template';
import { emitValue } from '../-private/dsl';

// Glimmer's SafeString interface
let safeString: SafeString = {
  toHTML(): string {
    return '<span>Foo</span>';
  },
};

emitValue(safeString);

// @ember/template's SafeString
emitValue(htmlSafe('<span>Foo</span>'));

// Emitting an HTML element inserts that element into the DOM
emitValue(document.createElement('div'));
emitValue(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
