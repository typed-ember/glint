import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import type { TestContext } from '@ember/test-helpers';

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

  module('with a type arg', function (hooks) {
    interface MyContext extends TestContext {
      target: string;
    }

    hooks.beforeEach(function (this: MyContext) {
      this.target = 'World';
    });

    test('is fine with static content', async function (assert) {
      await render<MyContext>(hbs`Hello!`);

      assert.dom().hasText('Hello!');
    });

    test('is fine accessing existing properties on `this`', async function (assert) {
      await render<MyContext>(hbs`
        Hello, {{this.target}}!
      `);

      assert.dom().hasText('Hello, World!');
    });

    test('causes a type error when accessing nonexistent properties on `this`', async function (assert) {
      await render<MyContext>(hbs`
        {{! @glint-expect-error: foo isn't a defined property }}
        Hello, {{this.foo}}!
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
