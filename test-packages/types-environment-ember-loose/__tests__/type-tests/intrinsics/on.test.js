import { expectTypeOf } from 'expect-type';
import { Globals, applyModifier, resolve, NamedArgsMarker, } from '@glint/environment-ember-loose/-private/dsl';
const on = resolve(Globals['on']);
const el = document.createElement('div');
on(el, 'click', () => { }, {
    // @ts-expect-error: extra named arg
    foo: 'bar',
    ...NamedArgsMarker,
});
// @ts-expect-error: missing positional arg
on(el, 'click');
// @ts-expect-error: extra positional arg
on(el, 'click', () => { }, 'hello');
on(el, 'scroll', () => { }, { capture: true, once: true, passive: true, ...NamedArgsMarker });
on(el, 'unknown', (event) => {
    expectTypeOf(event).toEqualTypeOf();
});
on(el, 'click', (event) => {
    expectTypeOf(event).toEqualTypeOf();
});
on(el, 'keyup', (event) => {
    expectTypeOf(event).toEqualTypeOf();
});
applyModifier(on(el, 'click', () => { }));
applyModifier(on(new SVGRectElement(), 'click', () => { }));
applyModifier(on(new Element(), 'click', () => { }));
//# sourceMappingURL=on.test.js.map