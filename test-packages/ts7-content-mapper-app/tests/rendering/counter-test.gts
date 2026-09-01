import { click, render } from "@ember/test-helpers";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

import Counter from "#components/counter.gts";

module("Rendering | counter", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders the initial count and increments by the step", async function (assert) {
    await render(
      <template>
        <Counter @initial={{2}} @step={{3}} as |count|>
          <span data-test-count>{{count}}</span>
        </Counter>
      </template>,
    );

    assert.dom("output").hasText("2");
    assert.dom("[data-test-count]").hasText("2");

    await click("button");

    assert.dom("output").hasText("5");
  });
});
