import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | bar', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert) {
    await render(hbs`<Bar @grault={{1234}} />`);

    if (!this.element.textContent) {
      throw new Error('No text content!');
    }

    assert.equal(this.element.textContent.trim(), 'BAR-1234');
  });

  test('it renders with incorrect arg type', async function(assert) {
    // typechecking here would be :100:
    // (but then we need a way to @ts-ignore for tests
    //  where we *intentionally* use bad args :thinking:)
    await render(hbs`<Bar @grault="hello" />`);

    if (!this.element.textContent) {
      throw new Error('No text content!');
    }

    assert.equal(this.element.textContent.trim(), 'BAR-hello');
  });

  test('it renders with incorrect args', async function(assert) {
    // also here
    await render(hbs`<Bar @plugh={{1234}} />`);

    if (!this.element.textContent) {
      throw new Error('No text content!');
    }

    assert.equal(this.element.textContent.trim(), 'BAR-');
  });

  test('it renders with missing args', async function(assert) {
    // and here
    await render(hbs`<Bar />`);

    if (!this.element.textContent) {
      throw new Error('No text content!');
    }

    assert.equal(this.element.textContent.trim(), 'BAR-');
  });
});
