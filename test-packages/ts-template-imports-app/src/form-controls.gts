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

// `...attributes` can replace the control's `name`, so it may be absent.
const spread = handler<{ query: HTMLInputElement }>();
export const SpreadForm: TOC<{ Element: HTMLInputElement }> = <template>
  {{! @glint-expect-error: ...attributes can replace the name, so query is optional }}
  <form {{on "submit" spread}}><input name="query" ...attributes /></form>
</template>;

export default class FormControls extends Component<{ Args: { flag: boolean; list: string[] } }> {
  submit = handler<{
    from: HTMLInputElement;
    plan: HTMLSelectElement;
    to?: HTMLInputElement;
    size: RadioNodeList & { value: 'small' | 'large' | '' };
    entry?: HTMLInputElement | RadioNodeList;
    password: HTMLInputElement;
    own?: HTMLInputElement;
    sibling: HTMLInputElement;
    engine?: unknown;
  }>();

  conditionalGroup = handler<{ size?: RadioNodeList & { value: 'small' | 'large' | '' } }>();
  notNamed = handler<{ from: HTMLInputElement }>();

  missing = handler<{ until: HTMLInputElement }>();
  required = handler<{ to: HTMLInputElement }>();
  wrongType = handler<{ plan: HTMLInputElement }>();
  radioValue = handler<{ size: RadioNodeList & { value: 'small' | '' } }>();
  dynamic = handler<{ other: HTMLInputElement }>();
  elsewhere = handler<{ elsewhere: HTMLInputElement }>();
  shadowed = handler<{ length: HTMLInputElement }>();
  notAControl = handler<{ frame: HTMLIFrameElement }>();
  customElement = handler<{ from: HTMLInputElement }>();
  image = handler<{ go: HTMLInputElement }>();
  maybeImage = handler<{ when: HTMLInputElement }>();
  index = handler<{ '0': HTMLInputElement }>();
  prototype = handler<{ constructor: HTMLInputElement }>();
  overridden = handler<{ from: HTMLInputElement }>();

  <template>
    <form id="main" {{on "submit" this.submit}}>
      <input name="from" />
      <select name="plan"></select>
      {{#if @flag}}<input name="to" />{{/if}}
      <input type="radio" name="size" value="small" />
      <input type="RADIO" name="size" value="large" />
      {{#each @list as |entry|}}<input name="entry" value={{entry}} />{{/each}}
      <input name="password" type={{if @flag "text" "password"}} />
      <input name="own" form="main" />
      {{#let Toggle as |input|}}<input />{{/let}}<input name="sibling" />
      <Toggle name="engine" />
    </form>

    <form {{on "submit" this.conditionalGroup}}>
      {{#if @flag}}
        <input type="radio" name="size" value="small" /><input type="radio" name="size" value="large" />
      {{/if}}
    </form>
    <form {{on "submit" this.notNamed}}><div id="elements"></div><input name="from" /></form>

    {{! @glint-expect-error: no control is named until }}
    <form {{on "submit" this.missing}}><input name="from" /></form>
    {{! @glint-expect-error: to renders only with @flag, so it is optional }}
    <form {{on "submit" this.required}}>{{#if @flag}}<input name="to" />{{/if}}</form>
    {{! @glint-expect-error: plan is a select, not an input }}
    <form {{on "submit" this.wrongType}}><select name="plan"></select></form>
    {{! @glint-expect-error: the handler does not handle the radio value xl }}
    <form {{on "submit" this.radioValue}}>
      <input type="radio" name="size" value="small" /><input type="radio" name="size" value="xl" />
    </form>
    {{! @glint-expect-error: a dynamic name is not seen }}
    <form {{on "submit" this.dynamic}}><input name={{if @flag "other" "x"}} /></form>
    {{! @glint-expect-error: a control with form="other" belongs to another form }}
    <form {{on "submit" this.elsewhere}}><input name="elsewhere" form="other" /></form>
    {{! @glint-expect-error: length is a property of the collection, so the control is not typed }}
    <form {{on "submit" this.shadowed}}><input name="length" /></form>
    {{! @glint-expect-error: an iframe is not a form control }}
    <form {{on "submit" this.notAControl}}><iframe name="frame"></iframe></form>
    {{! @glint-expect-error: from is also on a custom element, so it is unknown }}
    <form {{on "submit" this.customElement}}><input name="from" /><my-input name="from"></my-input></form>
    {{! @glint-expect-error: elements does not include type="image" }}
    <form {{on "submit" this.image}}><input type="image" name="go" alt="Go" /></form>
    {{! @glint-expect-error: type can be image, so when is optional }}
    <form {{on "submit" this.maybeImage}}><input type={{if @flag "date" "image"}} name="when" /></form>
    {{! @glint-expect-error: a numeric name is an index, so the control is not typed }}
    <form {{on "submit" this.index}}><input name="0" /></form>
    {{! @glint-expect-error: constructor is a property of the collection, so the control is not typed }}
    <form {{on "submit" this.prototype}}><input name="constructor" /></form>
    {{! @glint-expect-error: an element with id="elements" replaces form.elements, so the form is not typed }}
    <form {{on "submit" this.overridden}}><img id="elements" alt="" /><input name="from" /></form>
  </template>
}
