import Component from '@glimmer/component';
import { hash } from '@ember/helper';

const label = (name: string): string => name.toUpperCase();
const litres = (total: number): string => `${total.toFixed(1)} L`;

// A generic component that lists an object's entries. Without a direct
// signature for a generic `T`, the block params were `any`.
class Totals<T extends Record<string, number>> extends Component<{ Args: { totals: T } }> {
  <template>
    <dl>
      {{#each-in @totals as |name total|}}
        <dt>{{label name}}</dt>
        <dd>{{litres total}}</dd>
        {{! @glint-expect-error: the key is a string }}
        {{litres name}}
      {{/each-in}}
    </dl>
  </template>
}

// Keys are strings, but the values of a generic object are not known.
class Entries<T extends object> extends Component<{ Args: { object: T } }> {
  <template>
    {{#each-in @object as |key value|}}
      {{label key}}
      {{! @glint-expect-error: the value is unknown }}
      {{label value}}
    {{/each-in}}
  </template>
}

export const Uses = <template>
  <Totals @totals={{hash diesel=12 electric=3}} />
  <Entries @object={{hash name="Excavator"}} />
</template>;
