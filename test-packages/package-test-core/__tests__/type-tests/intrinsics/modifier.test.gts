import Modifier, { modifier } from 'ember-modifier';
import type { ModifierLike } from '@glint/template';
import { array } from '@ember/helper';
import { hash } from '@ember/helper';

class Render3DModelModifier extends Modifier<{
  Element: HTMLCanvasElement;
  Args: {
    Positional: [model: Array<[number, number, number]>];
    Named: { origin: { x: number; y: number } };
  };
}> {}

// Simple no-op binding
const NoopBindingTest = <template>
  {{#let (modifier Render3DModelModifier) as |noopRender|}}
    <canvas {{noopRender (array) origin=(hash x=0 y=0)}}></canvas>

    {{! @glint-expect-error: wrong element type }}
    <div {{noopRender (array) origin=(hash x=0 y=0)}}></div>
  {{/let}}
</template>;

// Pre-bound positional arg
const PreBoundPositionalTest = <template>
  {{#let (modifier Render3DModelModifier (array)) as |boundRender|}}
    <canvas {{boundRender origin=(hash x=0 y=0)}}></canvas>

    {{! @glint-expect-error: wrong element type }}
    <div {{boundRender origin=(hash x=0 y=0)}}></div>
  {{/let}}
</template>;

// Issue #886: Modifier with only optional args should work when bound
// with modifier keyword. Verified fixed.
declare const optMod: ModifierLike<{
  Args: { Named: { value?: string } };
}>;

const OptionalArgsTest = <template>
  {{#let (modifier optMod value="anything") as |aModifier|}}
    <div {{aModifier}}></div>
  {{/let}}
  {{#let (modifier optMod) as |noopMod|}}
    <div {{noopMod}}></div>
    <div {{noopMod value="test"}}></div>
  {{/let}}
</template>;

// Issue #719: exact repro — modifier<Signature>(() => {}) with optional
// named args inside (if ... (modifier ...)).
{
  interface Sig719 {
    Element: HTMLElement;
    Args: {
      Named: {
        block?: ScrollLogicalPosition;
      };
    };
  }

  const mod719 = modifier<Sig719>(() => {});

  const ConditionalModifierTest = <template>
    <div {{(if true (modifier mod719 block="nearest"))}}></div>
  </template>;
}

// Issue #812: Conditional modifier with positional args.
{
  const custom812 = modifier(
    (_el: HTMLElement, _positional: [string, (event: Event) => void]) => {},
  );
  const onSelect = undefined as ((event: Event) => void) | undefined;

  const ConditionalPositionalTest = <template>
    <button {{(if onSelect (modifier custom812 "click" onSelect))}}>
      test
    </button>
  </template>;
}

// Prebinding args at different locations
class MyriadPositionals extends Modifier<{
  Args: { Positional: [string, boolean, number] };
}> {}

const PrebindingTest = <template>
  <div {{MyriadPositionals "one" true 3}}></div>

  <div {{(modifier MyriadPositionals "one" true 3)}}></div>
  <div {{(modifier MyriadPositionals "one" true) 3}}></div>
  <div {{(modifier MyriadPositionals "one") true 3}}></div>
  <div {{(modifier MyriadPositionals) "one" true 3}}></div>
</template>;
