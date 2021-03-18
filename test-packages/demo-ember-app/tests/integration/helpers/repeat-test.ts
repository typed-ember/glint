import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | repeat', function(hooks) {
  setupRenderingTest(hooks);

  test('it repeats', async function(assert) {
    await render(hbs`{{repeat "foo" 3}}`);

    assert.equal(this.element.textContent?.trim(), 'foofoofoo');
  });
});
