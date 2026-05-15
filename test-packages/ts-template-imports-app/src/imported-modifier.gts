// Regression coverage for typed-ember/glint#1113:
// imported modifiers / helpers used inside <template> should not be typed as
// `never`. The bug surfaced as `TS2349: Type 'never' has no call signatures.`
// at the `{{on ...}}` invocation site.

import Component from '@glimmer/component';
import { on } from '@ember/modifier';

export default class ImportedModifier extends Component {
  handleChange = (event: Event): void => {
    void event;
  };

  <template>
    <button {{on "click" this.handleChange}} type="button">click</button>
  </template>
}
