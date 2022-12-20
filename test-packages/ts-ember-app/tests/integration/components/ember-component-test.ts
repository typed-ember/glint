import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | ember', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    await render(hbs`<EmberComponent @required="foo" />`);
    assert.dom().matchesText(/foo\s+defaultValue\s+foo/);
  });

  test('it renders with incorrect arg type', async function (assert) {
    await render(hbs`<EmberComponent @required=1 />`);
    assert.dom().matchesText(/1\s+defaultValue\s+1/);
  });

  test('it renders with missing args', async function (assert) {
    await render(hbs`
      {{! @glint-expect-error: missing args }}
      <EmberComponent />
    `);

    assert.dom().hasText('defaultValue');
  });
});
