import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import 'qunit-dom';

module('Integration | component test', function (hooks) {
  setupRenderingTest(hooks);

  interface MyTestContext {
    message: string;
  }

  test('typechecking', async function (this: MyTestContext, assert) {
    this.message = 'hi';

    await render<MyTestContext>(hbs`
      {{this.message}}
    `);

    assert.dom().hasText('message');
  });
});
