import Component from '@glimmer/component';
import { on } from '@ember/modifier';
import type { TOC } from '@ember/component/template-only';

type Submit<Elements> = (
  event: SubmitEvent & { currentTarget: HTMLFormElement & { elements: Elements } },
) => void;
const handler = <Elements,>(): Submit<Elements> => () => {};

const Toggle: TOC<{ Element: HTMLInputElement }> = <template>
  <input type="checkbox" ...attributes />
</template>;
const Fieldset: TOC<{ Blocks: { default: [] } }> = <template>
  <fieldset>{{yield}}</fieldset>
</template>;

// A component may render any number of controls under a name, or none.
export default class FormControlComponents extends Component<{ Args: { flag: boolean } }> {
  submit = handler<{
    engine?: unknown;
    size?: RadioNodeList & { value: 'small' | 'large' | '' };
  }>();

  typed = handler<{ engine: HTMLInputElement }>();
  elements = handler<{ from: HTMLInputElement }>();

  <template>
    <form {{on "submit" this.submit}}>
      <Toggle name="engine" />
      <Fieldset>
        <input type="radio" name="size" value="small" /><input type="radio" name="size" value="large" />
      </Fieldset>
    </form>

    {{! @glint-expect-error }}
    <form {{on "submit" this.typed}}><Toggle name="engine" /></form>
    {{! @glint-expect-error }}
    <form {{on "submit" this.elements}}><Toggle name="elements" /><input name="from" /></form>
  </template>
}
