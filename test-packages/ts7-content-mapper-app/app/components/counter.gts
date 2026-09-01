import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

import { autofocus } from "#app/modifiers/autofocus.ts";
import { formatCount } from "#utils/format.ts";

export interface CounterSignature {
  Args: {
    initial?: number;
    step?: number;
  };
  Blocks: {
    default: [count: number];
  };
  Element: HTMLDivElement;
}

export default class Counter extends Component<CounterSignature> {
  @tracked count = this.args.initial ?? 0;

  get step(): number {
    return this.args.step ?? 1;
  }

  increment = (): void => {
    this.count += this.step;
  };

  decrement = (): void => {
    this.count -= this.step;
  };

  <template>
    <div ...attributes>
      <output>{{formatCount this.count}}</output>
      <button type="button" {{autofocus}} {{on "click" this.increment}}>
        +{{this.step}}
      </button>
      <button type="button" {{on "click" this.decrement}}>
        -{{this.step}}
      </button>
      {{yield this.count}}
    </div>
  </template>
}
