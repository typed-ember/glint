import Modifier, { modifier } from 'ember-modifier';
import { NamedArgsMarker, resolve } from '@glint/environment-ember-loose/-private/dsl';
import { expectTypeOf } from 'expect-type';
import { registerDestructor } from '@ember/destroyable';
// Class-based modifier
{
    class NeatModifier extends Modifier {
        constructor(owner, args) {
            super(owner, args);
            registerDestructor(this, () => window.clearInterval(this.interval));
        }
        modify(element, [input], { multiplier }) {
            // expectTypeOf(element).toEqualTypeOf<HTMLImageElement>();
            this.multiplier = multiplier ?? 1000;
            const lengthOfInput = input.length;
            window.clearInterval(this.interval);
            this.interval = window.setInterval(() => {
                alert('this is a typesafe modifier!');
            }, this.multiplier * lengthOfInput);
        }
    }
    let img = new HTMLImageElement();
    let neat = resolve(NeatModifier);
    expectTypeOf(neat(img, 'hello')).toEqualTypeOf();
    expectTypeOf(neat(img, 'hello', { multiplier: 3, ...NamedArgsMarker })).toEqualTypeOf();
    neat(
    // @ts-expect-error: invalid element type
    new HTMLDivElement(), 'hello');
    // @ts-expect-error: missing required positional arg
    neat(img);
    neat(img, 'hello', 
    // @ts-expect-error: extra positional arg
    'goodbye');
    neat(img, 'message', {
        // @ts-expect-error: invalid type for named arg
        multiplier: 'hi',
        ...NamedArgsMarker,
    });
    neat(img, 'message', {
        // @ts-expect-error: invalid named arg
        hello: 123,
        ...NamedArgsMarker,
    });
}
// Function-based modifier
{
    let definition = modifier((element, [input], { multiplier }) => {
        let interval = window.setInterval(() => {
            alert('this is a typesafe modifier!');
        }, input.length * (multiplier ?? 1000));
        return () => window.clearInterval(interval);
    });
    let audio = new HTMLAudioElement();
    let neat = resolve(definition);
    expectTypeOf(neat(audio, 'hello')).toEqualTypeOf();
    expectTypeOf(neat(audio, 'hello', { multiplier: 3, ...NamedArgsMarker })).toEqualTypeOf();
    neat(
    // @ts-expect-error: invalid element type
    new HTMLDivElement(), 'hello');
    // @ts-expect-error: missing required positional arg
    neat(audio);
    neat(audio, 'hello', 
    // @ts-expect-error: extra positional arg
    'goodbye');
    neat(audio, 'message', {
        // @ts-expect-error: invalid type for named arg
        multiplier: 'hi',
        ...NamedArgsMarker,
    });
    neat(audio, 'message', {
        // @ts-expect-error: invalid named arg
        hello: 123,
        ...NamedArgsMarker,
    });
}
// Modifiers are `ModifierLike`
{
    class MyModifier extends Modifier {
    }
    const myModifier = modifier(() => { });
    expectTypeOf(MyModifier).toMatchTypeOf();
    expectTypeOf(myModifier).toMatchTypeOf();
}
//# sourceMappingURL=modifier.test.js.map