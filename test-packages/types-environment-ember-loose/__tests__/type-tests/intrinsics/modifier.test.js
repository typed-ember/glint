import Modifier from 'ember-modifier';
import { hbs } from 'ember-cli-htmlbars';
import { typeTest } from '@glint/type-test';
class Render3DModelModifier extends Modifier {
}
// Simple no-op binding
typeTest({ renderModel: Render3DModelModifier }, hbs `
    {{#let (modifier this.renderModel) as |noopRender|}}
      <canvas {{noopRender (array) origin=(hash x=0 y=0)}}></canvas>

      {{! @glint-expect-error: wrong element type }}
      <div {{noopRender (array) origin=(hash x=0 y=0)}}></div>

      {{! @glint-expect-error: missing positional }}
      <canvas {{noopRender origin=(hash x=0 y=0)}}></canvas>

      {{! @glint-expect-error: extra named arg }}
      <canvas {{noopRender (array) origin=(hash x=0 y=0) extra="bad"}}></canvas>

      {{! @glint-expect-error: extra positional arg }}
      <canvas {{noopRender (array) "hello" origin=(hash x=0 y=0)}}></canvas>
    {{/let}}
  `);
// Pre-bound positional arg
typeTest({ renderModel: Render3DModelModifier }, hbs `
    {{#let (modifier this.renderModel (array)) as |boundRender|}}
      <canvas {{boundRender origin=(hash x=0 y=0)}}></canvas>

      {{! @glint-expect-error: wrong element type }}
      <div {{boundRender origin=(hash x=0 y=0)}}></div>

      {{! @glint-expect-error: extra named arg }}
      <canvas {{boundRender origin=(hash x=0 y=0) extra="bad"}}></canvas>

      {{! @glint-expect-error: extra positional arg }}
      <canvas {{boundRender "hello" origin=(hash x=0 y=0)}}></canvas>
    {{/let}}
  `);
// Pre-bound named arg
typeTest({ renderModel: Render3DModelModifier }, hbs `
    {{#let (modifier this.renderModel origin=(hash x=0 y=0)) as |boundRender|}}
    <canvas {{boundRender (array)}}></canvas>
    <canvas {{boundRender (array) origin=(hash x=1 y=-1)}}></canvas>

      {{! @glint-expect-error: wrong element type }}
      <div {{boundRender (array)}}></div>

      {{! @glint-expect-error: extra named arg }}
      <canvas {{boundRender (array) extra="bad"}}></canvas>

      {{! @glint-expect-error: extra positional arg }}
      <canvas {{boundRender (array) "hello"}}></canvas>
    {{/let}}
  `);
// Prebinding args at different locations
typeTest({
    myriad: class MyriadPositionals extends Modifier {
    },
}, hbs `
    <div {{this.myriad "one" true 3}}></div>
    
    <div {{(modifier this.myriad "one" true 3)}}></div>
    <div {{(modifier this.myriad "one" true) 3}}></div>
    <div {{(modifier this.myriad "one") true 3}}></div>
    <div {{(modifier this.myriad) "one" true 3}}></div>

    {{! @glint-expect-error: missing arg }}
    <div {{(modifier this.myriad "one" true)}}></div>

    {{! @glint-expect-error: extra arg }}
    <div {{(modifier this.myriad "one" true 3) "four"}}></div>
  `);
//# sourceMappingURL=modifier.test.js.map