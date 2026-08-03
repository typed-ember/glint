import Component from '@glimmer/component';
import type { ComponentLike, WithBoundArgs } from '@glint/template';
import { hash } from '@ember/helper';

// Regression guard for https://github.com/typed-ember/glint/issues/1068 (the
// "deep" report): a generic component curried via `{{component}}` in a
// `{{#let}}` and passed as an ARG to another generic component must not
// poison the consumer's type-parameter inference. `bindInvokable` keeps the
// curried component's own generic free (required for `WithBoundArgs<typeof
// C, K>`-shaped targets); TypeScript instantiates that free generic to its
// constraint during inference, and the collapsed candidate used to beat the
// correct inference from sibling args. The transform now casts such
// references to `InferenceInertInvokable` in arg position only.

interface Identifiable {
  id: string;
}

interface User extends Identifiable {
  name: string;
  role: 'admin' | 'editor' | 'viewer';
}

interface Product extends Identifiable {
  title: string;
  price: number;
}

class Cell<T extends Identifiable> extends Component<{
  Args: {
    item: T;
    onSelect: (item: T) => void;
    highlight?: boolean;
  };
  Blocks: {
    default: [T];
  };
  Element: HTMLTableCellElement;
}> {
  <template>
    <td ...attributes>
      {{yield @item}}
    </td>
  </template>
}

class Row<T extends Identifiable> extends Component<{
  Args: {
    BoundCell: WithBoundArgs<ComponentLike<{
      Args: { item: T; highlight?: boolean };
      Blocks: { default: [T] };
      Element: HTMLTableCellElement;
    }>, never>;
    item: T;
    isSelected: boolean;
  };
  Blocks: {
    default: [T];
  };
  Element: HTMLTableRowElement;
}> {
  <template>
    <tr ...attributes>
      <@BoundCell @item={{@item}} @highlight={{@isSelected}} as |cellItem|>
        {{yield cellItem}}
      </@BoundCell>
    </tr>
  </template>
}

class DataTable<T extends Identifiable> extends Component<{
  Args: {
    items: T[];
    selected: T;
    onSelect: (item: T) => void;
  };
  Blocks: {
    default: [T];
  };
  Element: HTMLTableElement;
}> {
  <template>
    <table ...attributes>
      <tbody>
        {{#let (component Cell onSelect=@onSelect) as |BoundCell|}}
          {{#each @items as |item|}}
            <Row
              @BoundCell={{BoundCell}}
              @item={{item}}
              @isSelected={{(this.isSelected item)}}
              as |rowItem|
            >
              {{yield rowItem}}
            </Row>
          {{/each}}
        {{/let}}
      </tbody>
    </table>
  </template>

  isSelected = (item: T): boolean => {
    return item.id === this.args.selected.id;
  };
}

class UserTable extends DataTable<User> {}

export default class GenericCurryingShowcase extends Component {
  users: User[] = [
    { id: '1', name: 'Ada Lovelace', role: 'admin' },
    { id: '2', name: 'Grace Hopper', role: 'editor' },
    { id: '3', name: 'Lin Clark', role: 'viewer' },
  ];

  products: Product[] = [
    { id: 'p1', title: 'Widget', price: 9.99 },
    { id: 'p2', title: 'Gadget', price: 19.99 },
  ];

  selectedUser = this.users[0]!;
  selectedProduct = this.products[0]!;

  handleUserSelect = (user: User): void => {
    this.selectedUser = user;
  };

  handleProductSelect = (product: Product): void => {
    this.selectedProduct = product;
  };

  <template>
    {{! T=User flows through currying into the yielded block param }}
    <UserTable
      @items={{this.users}}
      @selected={{this.selectedUser}}
      @onSelect={{this.handleUserSelect}}
      as |user|
    >
      {{user.name}}
      {{user.role}}

      {{! @glint-expect-error: User has no `price` — T is User, not Product or Identifiable }}
      {{user.price}}
    </UserTable>

    {{! T=Product via direct generic DataTable usage }}
    <DataTable
      @items={{this.products}}
      @selected={{this.selectedProduct}}
      @onSelect={{this.handleProductSelect}}
      as |product|
    >
      {{product.title}}
      {{product.price}}
    </DataTable>

    <UserTable
      @items={{this.users}}
      @selected={{this.selectedUser}}
      {{! @glint-expect-error: onSelect expects a User callback, not Product }}
      @onSelect={{this.handleProductSelect}}
    />

    <UserTable
      {{! @glint-expect-error: items expects User[], not Product[] }}
      @items={{this.products}}
      @selected={{this.selectedUser}}
      @onSelect={{this.handleUserSelect}}
    />
  </template>
}

// ── Case A guard: the ORIGINAL #1068 shape must keep working ─────────────
// A curried generic reaching a generic-shaped `WithBoundArgs<typeof C, K>`
// target (via yield) relies on the holistic, generic-preserving type; the
// arg-position cast must not apply to yield positions — whether the curried
// value is yielded directly or via a `{{#let}}` alias.
class PickerOption<T> extends Component<{
  Args: { value: T; onSelect: (value: T) => void };
  Blocks: { default: [T] };
}> {
  <template>{{yield @value}}</template>
}

export class Picker<T> extends Component<{
  Args: { onSelect: (value: T) => void };
  Blocks: {
    default: [WithBoundArgs<typeof PickerOption, 'onSelect'>];
    aliased: [{ Option: WithBoundArgs<typeof PickerOption, 'onSelect'> }];
  };
}> {
  <template>
    {{yield (component PickerOption onSelect=@onSelect)}}

    {{#let (component PickerOption onSelect=@onSelect) as |Curried|}}
      {{yield (hash Option=Curried) to="aliased"}}
    {{/let}}
  </template>
}
