import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | ember', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    await render(hbs`<EmberComponent @required="foo" />`);

    if (!this.element.textContent) {
      throw new Error('No text content!');
    }

    assert.deepEqual(this.element.textContent.trim().split(/\s+/), ['foo', 'defaultValue', 'foo']);
  });

  test('it renders with incorrect arg type', async function (assert) {
    await render(hbs`<EmberComponent @required=1 />`);

    if (!this.element.textContent) {
      throw new Error('No text content!');
    }

    assert.deepEqual(this.element.textContent.trim().split(/\s+/), ['1', 'defaultValue', '1']);
  });

  test('it renders with missing args', async function (assert) {
    await render(hbs`
      {{! @glint-expect-error: missing args }}
      <EmberComponent />
    `);

    if (!this.element.textContent) {
      throw new Error('No text content!');
    }

    assert.equal(this.element.textContent.trim(), 'defaultValue');
  });
});
