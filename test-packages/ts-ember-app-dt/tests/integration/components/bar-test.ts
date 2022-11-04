import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import type { TestContext } from '@ember/test-helpers';

module('Integration | Component | bar', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    await render(hbs`<Bar @grault={{1234}} />`);

    if (!this.element.textContent) {
      throw new Error('No text content!');
    }

    assert.equal(this.element.textContent.trim(), 'BAR-1234');
  });

  test('it renders with incorrect arg type', async function (assert) {
    await render(hbs`
      {{! @glint-expect-error: bad type }}
      <Bar @grault="hello" />
    `);

    if (!this.element.textContent) {
      throw new Error('No text content!');
    }

    assert.equal(this.element.textContent.trim(), 'BAR-hello');
  });

  test('it renders with incorrect args', async function (assert) {
    await render(hbs`
      {{! @glint-expect-error: bad arg name }}
      <Bar @plugh={{1234}} />
    `);

    if (!this.element.textContent) {
      throw new Error('No text content!');
    }

    assert.equal(this.element.textContent.trim(), 'BAR-');
  });

  test('it renders with missing args', async function (assert) {
    await render(hbs`
      {{! @glint-expect-error: missing arg }}
      <Bar />
    `);

    if (!this.element.textContent) {
      throw new Error('No text content!');
    }

    assert.equal(this.element.textContent.trim(), 'BAR-');
  });

  module('with a custom test context', function () {
    interface MyTestContext extends TestContext {
      message: string;
    }

    test('types work as expected', async function (this: MyTestContext, assert) {
      this.message = 'hello';

      await render<MyTestContext>(hbs`
        <Bar @grault={{this.message.length}} />

        {{! @glint-expect-error: bad arg type }}
        <Bar @grault={{this.message}} />
      `);

      assert.deepEqual(this.element.textContent?.trim().split(/\s+/), ['BAR-5', 'BAR-hello']);
    });
  });
});
