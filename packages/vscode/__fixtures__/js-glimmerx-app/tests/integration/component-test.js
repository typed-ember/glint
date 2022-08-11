import Component, { hbs } from '@glimmerx/component';
import { renderComponent } from '@glimmerx/core';
import { module, test } from 'qunit';

const getTestRoot = () => document.getElementById('qunit-fixture') || document.body;

module('Integration | component test', function () {
  test('typechecking', async (assert) => {
    class TestComponent extends Component {
      static template = hbs`
        {{this.message}}
      `;

      get message() {
        return 'hi';
      }
    }

    const container = getTestRoot();
    await renderComponent(TestComponent, container);

    assert.equal(container.textContent.trim(), 'hi');
  });
});
