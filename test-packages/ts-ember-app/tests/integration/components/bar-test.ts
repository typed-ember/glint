import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import type { TestContext } from '@ember/test-helpers';

module('Integration | Component | bar', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    await render(hbs`<Bar @grault={{1234}} />`);
    assert.dom().hasText('BAR-1234');
  });

  test('it renders with incorrect arg type', async function (assert) {
    await render(hbs`
      {{! @glint-expect-error: bad type }}
      <Bar @grault="hello" />
    `);
    assert.dom().hasText('BAR-hello');
  });

  test('it renders with incorrect args', async function (assert) {
    await render(hbs`
      {{! @glint-expect-error: bad arg name }}
      <Bar @plugh={{1234}} />
    `);
    assert.dom().hasText('BAR-');
  });

  test('it renders with missing args', async function (assert) {
    await render(hbs`
      {{! @glint-expect-error: missing arg }}
      <Bar />
    `);
    assert.dom().hasText('BAR-');
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
      assert.dom().matchesText(/BAR-5\s+BAR-hello/);
    });
  });
});
