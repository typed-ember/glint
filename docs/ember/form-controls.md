# Form Controls

Glint types a `<form>`'s `elements` from the named controls in its template. A submit handler declares the controls it reads, and Glint checks that declaration against the template.

```gts
import Component from '@glimmer/component';
import { on } from '@ember/modifier';

export default class NewProject extends Component {
  submit = (
    event: SubmitEvent & {
      currentTarget: HTMLFormElement & {
        elements: {
          name: HTMLInputElement;
          plan: HTMLSelectElement;
          public: HTMLInputElement;
          size: RadioNodeList & { value: 'small' | 'large' | '' };
        };
      };
    },
  ) => {
    event.preventDefault();
    let { name, plan, public: isPublic, size } = event.currentTarget.elements;
    save({ name: name.value, plan: plan.value, isPublic: isPublic.checked, size: size.value });
  };

  <template>
    <form {{on "submit" this.submit}}>
      <input name="name" required />
      <select name="plan">…</select>
      <input name="public" type="checkbox" />
      <input name="size" type="radio" value="small" />
      <input name="size" type="radio" value="large" />
    </form>
  </template>
}
```

No `as HTMLInputElement`, no `formData.get('name') as string`.

## What it catches

The error is reported on the form's `{{on "submit"}}`.

| Template                                              | Handler declares            | Result                    |
| ----------------------------------------------------- | --------------------------- | ------------------------- |
| `name="plan"` renamed or removed                      | `plan: HTMLSelectElement`   | `'plan' is missing`       |
| `<select name="plan">` changed to `<input>`           | `plan: HTMLSelectElement`   | type mismatch             |
| `{{#if @pro}}<select name="plan">{{/if}}`             | `plan: HTMLSelectElement`   | must be `plan?:`          |
| a second `name="plan"`, or another control `id="plan"` | `plan: HTMLSelectElement`   | it is a `RadioNodeList`   |
| `<input type="radio" name="size" value="medium">`     | `value: 'small' \| 'large' \| ''` | `'medium'` not assignable |

## How controls are found

- **Controls:** static `name` or `id` on `button`, `fieldset`, `input`, `object`, `output`, `select` and `textarea`, the HTML spec's [listed elements](https://html.spec.whatwg.org/multipage/forms.html#category-listed). `<input type="image">` is left out, because `elements` does not include it.
- **`{{#if}}` / `{{#unless}}`:** optional, unless every branch renders the control.
- **`{{#let}}`:** no change.
- **`{{#each}}`, component blocks:** optional, and may be a `RadioNodeList`. An `{{#each}}` whose `{{else}}` renders the control too makes it required.
- **A dynamic `type`:** optional if it can be `image`. `{{if}}` and `{{unless}}` with string branches are read.
- **Radio groups with static `value`s:** `value` is the union of them, or `''` while none is checked.
- **`unknown`:** a name on a component, which may render any number of controls under it, or none, and on a custom element, which may be form-associated.
- **`...attributes` on a control:** optional, because the caller can replace its `name`.
- **`form="…"`:** a control that names another form's `id`, or `form=""`, is left out. One that names this form's `id`, or a dynamic one, is optional, because another copy of the form can have the same `id`.
- **Not seen:** dynamic names and `id`s, names and `id`s a caller passes through `...attributes`, `{{#in-element}}`, controls that a component, `{{yield}}`, `{{outlet}}`, `{{mount}}` or `{{{html}}}` renders, and controls outside the form that join it with `form="…"`. If one of them has the same name as a control in the template, `elements` returns a `RadioNodeList` that the type does not show. If one of them is named `elements`, it replaces `form.elements`.
- **Not typed:** a form with a control, image, component or custom element named `elements`, which replaces `form.elements`, and forms in `.gjs` files.

## Limits

- **Optional controls are not checked.** TypeScript does not report a declared optional property that the template lacks, so `{ email?: HTMLInputElement }` still compiles after `name="email"` is renamed.
- **Without `strictFunctionTypes`,** the handler's parameter is compared in both directions. A removed or conditional control, a new radio value, or a name on a component is then not reported.
