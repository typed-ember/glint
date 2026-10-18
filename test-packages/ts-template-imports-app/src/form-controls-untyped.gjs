// @ts-check
import Component from '@glimmer/component';
import { on } from '@ember/modifier';

export default class FormControlsUntyped extends Component {
  /** @param {SubmitEvent & { currentTarget: HTMLFormElement }} event */
  submit = (event) => event.preventDefault();

  /** @param {SubmitEvent & { currentTarget: HTMLInputElement }} event */
  wrongTarget = (event) => event.preventDefault();

  <template>
    <form class="form" {{on "submit" this.submit}}><input name="from" /></form>

    {{! @glint-expect-error }}
    <form {{on "submit" this.wrongTarget}}><input name="from" /></form>
  </template>
}
