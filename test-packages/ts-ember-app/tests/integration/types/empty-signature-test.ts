import { module, test } from 'qunit';
import { render } from '@ember/test-helpers';
import { setupRenderingTest } from 'ember-qunit';
import { ComponentLike, HelperLike, ModifierLike } from '@glint/template';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Types | empty object signature members', function (hooks) {
  setupRenderingTest(hooks);

  /* eslint-disable @typescript-eslint/ban-types */
  interface TestContext {
    component: ComponentLike<{ Args: {}; Blocks: {} }>;
    helper: HelperLike<{ Args: { Named: {} }; Return: void }>;
    modifier: ModifierLike<{ Args: { Named: {} } }>;
  }

  test('component invocation', async function (assert) {
    assert.expect(0);
    await render<TestContext>(hbs`
      <this.component />

      {{! @glint-expect-error: shouldn't accept blocks }}
      <this.component></this.component>

      <this.component>
        {{! @glint-expect-error: shouldn't accept blocks }}
        <:named></:named>
      </this.component>

       <this.component
        {{! @glint-expect-error: shouldn't accept args }}
        @foo="hi"
      />
    `);
  });

  test('helper invocation', async function (assert) {
    assert.expect(0);
    await render<TestContext>(hbs`
      {{this.helper}}

      {{! @glint-expect-error: shouldn't accept args }}
      {{this.helper arg='hello'}}
    `);
  });

  test('modifier invocation', async function (assert) {
    assert.expect(0);
    await render<TestContext>(hbs`
      <div {{this.modifier}}></div>

      <div
        {{! @glint-expect-error: shouldn't accept args }}
        {{this.modifier arg='hello'}}
      ></div>
    `);
  });
});
