import Component from "@glimmer/component";

interface ButtonSignature<AsDiv extends boolean | undefined = undefined> {
  Element: AsDiv extends true ? HTMLDivElement : HTMLButtonElement;
  Args: { asDiv?: AsDiv };
  Blocks: { default: [] };
}

declare class Button<
  AsDiv extends boolean | undefined = undefined,
> extends Component<ButtonSignature<AsDiv>> {}

interface ActionSignature<E extends HTMLElement> {
  Element: E;
  Blocks: { default: [] };
}

declare class Action<E extends HTMLElement> extends Component<
  ActionSignature<E>
> {}

export class Select<IsFake extends boolean = false> extends Component<{
  Args: { fake?: IsFake };
}> {
  declare asDiv: IsFake;

  <template>
    <Button @asDiv={{this.asDiv}} id="trigger" aria-haspopup="listbox">
      Open
    </Button>
  </template>
}

export class Wrapper<E extends HTMLButtonElement> extends Component<{
  Args: { action: typeof Action<E> };
}> {
  <template>
    <@action id="action" title="Run">Run</@action>
  </template>
}
