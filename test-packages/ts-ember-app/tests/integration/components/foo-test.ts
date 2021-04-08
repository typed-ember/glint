import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | foo', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    await render(hbs`<Foo />`);

    if (!this.element.textContent) {
      throw new Error('No text content!');
    }

    assert.deepEqual(this.element.textContent.trim().split(/\s+/), [
      'FOO',
      'BAR-0',
      'BAR-A',
      'BAR-',
      'BAR-',
      'BAZ',
      'QUX',
      'defaultValue',
      'req',
      'defaultValue',
      'req',
      '1',
      'defaultValue',
      '1',
      'req',
      '1',
      'defaultValue',
      'req',
      '1',
      'req',
      'opt',
      'defaultValue',
      'req',
      'opt',
      'req',
      'override',
      'req',
      'override',
      'req',
      'false',
      'req',
      'false',
      'req',
      '1',
      'defaultValue',
      'req',
      '1',
      'foofoofoo',
    ]);
  });
});
