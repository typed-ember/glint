import Component from "@glimmer/component";
import { trackedArray } from "@ember/reactive/collections";

export default class TodoList extends Component {
  items = trackedArray(["Type-check templates with tsc"]);

  add = (event: SubmitEvent): void => {
    event.preventDefault();
    if (!(event.currentTarget instanceof HTMLFormElement)) {
      return;
    }

    const title = new FormData(event.currentTarget).get("title");
    if (typeof title === "string" && title.trim()) {
      this.items.push(title.trim());
      event.currentTarget.reset();
    }
  };

  <template>
    <form {{on "submit" this.add}}>
      <label>
        New item
        <input name="title" type="text" />
      </label>
      <button type="submit">Add</button>
    </form>
    <ul>
      {{#each this.items as |item|}}
        <li>{{item}}</li>
      {{/each}}
    </ul>
  </template>
}
