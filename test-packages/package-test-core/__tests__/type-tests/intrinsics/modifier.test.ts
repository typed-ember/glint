import Modifier, { modifier } from 'ember-modifier';
import { hbs } from 'ember-cli-htmlbars';
import { typeTest } from '@glint/type-test';

class Render3DModelModifier extends Modifier<{
  Element: HTMLCanvasElement;
  Args: {
    Positional: [model: Array<[number, number, number]>];
    Named: { origin: { x: number; y: number } };
  };
}> {}

// Simple no-op binding
typeTest(
  { renderModel: Render3DModelModifier },
  hbs`
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
  `,
);

// Pre-bound positional arg
typeTest(
  { renderModel: Render3DModelModifier },
  hbs`
    {{#let (modifier this.renderModel (array)) as |boundRender|}}
      <canvas {{boundRender origin=(hash x=0 y=0)}}></canvas>

      {{! @glint-expect-error: wrong element type }}
      <div {{boundRender origin=(hash x=0 y=0)}}></div>

      {{! @glint-expect-error: extra named arg }}
      <canvas {{boundRender origin=(hash x=0 y=0) extra="bad"}}></canvas>

      {{! @glint-expect-error: extra positional arg }}
      <canvas {{boundRender "hello" origin=(hash x=0 y=0)}}></canvas>
    {{/let}}
  `,
);

// Pre-bound named arg
typeTest(
  { renderModel: Render3DModelModifier },
  hbs`
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
  `,
);

// Issue #812: Conditional modifier with positional args.
// {{(if @onSelect (modifier custom "click" @onSelect))}} produced TS2589/TS2554.
typeTest(
  {
    custom: modifier((_el: HTMLElement, _positional: [string, (event: Event) => void]) => {}),
    onSelect: undefined as ((event: Event) => void) | undefined,
  },
  hbs`
    <button {{(if this.onSelect (modifier this.custom "click" this.onSelect))}}>
      test
    </button>
  `,
);

// Prebinding args at different locations
typeTest(
  {
    myriad: class MyriadPositionals extends Modifier<{
      Args: { Positional: [string, boolean, number] };
    }> {},
  },
  hbs`
    <div {{this.myriad "one" true 3}}></div>
    
    <div {{(modifier this.myriad "one" true 3)}}></div>
    <div {{(modifier this.myriad "one" true) 3}}></div>
    <div {{(modifier this.myriad "one") true 3}}></div>
    <div {{(modifier this.myriad) "one" true 3}}></div>

    {{! @glint-expect-error: missing arg }}
    <div {{(modifier this.myriad "one" true)}}></div>

    {{! @glint-expect-error: extra arg }}
    <div {{(modifier this.myriad "one" true 3) "four"}}></div>
  `,
);
