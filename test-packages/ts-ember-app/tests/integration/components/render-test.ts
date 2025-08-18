import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | bar', function (hooks) {
  setupRenderingTest(hooks);

  module('with no type arg', function () {
    test('is fine with static content', async function (assert) {
      await render(hbs`Hello!`);

      assert.dom().hasText('Hello!');
    });

    test('causes a type error when accessing properties on `this`', async function (assert) {
      await render(hbs`
        {{! 
          @glint-ignore
          In TS <= 4.7, this is incorrectly allowed because TS infers 'never' as the type of 'this'.
          In TS 4.8+, this correctly produces an error.
          TODO: Once we only support 4.8+, this should become a @glint-expect-error.
        }}
        Hello, {{this.target}}!
      `);

      assert.dom().hasText('Hello, !');
    });

    test('causes a type error when accessing @args', async function (assert) {
      await render(hbs`
        {{! @glint-expect-error: no args in test templates }}
        Hello, {{@target}}!
      `);

      assert.dom().hasText('Hello, !');
    });
  });
});
