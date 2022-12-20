import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | ember', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    await render(hbs`
      <TemplateOnlyModule @message="Hello" />

      {{#if false}}
        {{! @glint-expect-error: message is required }}
        <TemplateOnlyModule />
      {{/if}}
    `);

    assert.dom().hasText('Hello, world');
  });
});
