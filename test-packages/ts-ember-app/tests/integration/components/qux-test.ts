import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | qux', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert) {
    await render(hbs`<Qux />`);

    if (!this.element.textContent) {
      throw new Error('No text content!');
    }

    assert.equal(this.element.textContent.trim(), 'QUX');
  });
});
