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

// A mapped type over a generic `T`, from #1259. Before the overloads, the
// block params were a deferred conditional type and errored in both places.
interface TabsSignature<T> {
  Args: { tabs: { readonly [K in keyof T]: boolean | undefined } };
}

class Tabs<T> extends Component<TabsSignature<T>> {
  isShown = (tab: TabsSignature<T>['Args']['tabs'][keyof T]): boolean => !!tab;

  <template>
    {{#each-in @tabs as |name shown|}}
      {{name}}
      {{#if (this.isShown shown)}}{{/if}}
    {{/each-in}}
  </template>
}

// A record with generic keys and values.
class Pairs<K extends string, V> extends Component<{
  Args: { pairs: Record<K, V>; format: (value: V) => string };
}> {
  <template>
    {{#each-in @pairs as |key value|}}
      {{label key}}
      {{@format value}}
    {{/each-in}}
  </template>
}

// A generic type with no constraint keeps the `any` block params it had
// before the direct signature.
class Anything<T> extends Component<{ Args: { value: T } }> {
  <template>
    {{#each-in @value as |key value|}}
      {{label key}}
      {{litres value}}
    {{/each-in}}
  </template>
}

export const Uses = <template>
  <Totals @totals={{hash diesel=12 electric=3}} />
  <Entries @object={{hash name="Excavator"}} />
  <Tabs @tabs={{hash diesel=true}} />
  <Pairs @pairs={{hash a=1}} @format={{litres}} />
  <Anything @value={{hash a=1}} />
</template>;
