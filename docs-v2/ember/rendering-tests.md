Templates rendered in tests using `ember-cli-htmlbars`'s `hbs` tag will be checked the same way as standalone `hbs` files.

```typescript
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

test('MyComponent works', async function (assert) {
  // If `@arg` is declared to be a string, you'll get a squiggle here
  await render(hbs`<MyComponent @arg={{123}} />`);

  assert.dom().hasText('...');
});
```

In some TypeScript codebases it's common practice to define per-module (or even per-test) context types that include additional properties. If you do this and need to access these properties in your template, you can include the context type as a parameter to `render`.

```typescript
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import type { TestContext } from '@ember/test-helpers';

interface MyContext extends TestContext {
  message: string;
}

test('MyComponent works', async function (this: MyContext, assert) {
  this.message = 'hello';

  await render<MyContext>(hbs`
    <MyComponent @arg={{this.message}} />
  `);

  assert.dom().hasText('...');
});
```
