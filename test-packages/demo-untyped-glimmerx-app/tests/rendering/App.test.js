import { module, test, renderComponent } from '../util';

import App from '../../src/App';

module('App test', () => {
  test('it works', async (assert) => {
    await renderComponent(App);

    assert.dom('h1').containsText('Welcome to the untyped JS GlimmerX demo app!');
  });
});
