# Glint with JavaScript

If you have not yet migrated your project to TypeScript or you are in the process of migrating your project, the Glint CLI and language server will still function properly.

### Setup

All the Glint setup steps are identical.

{% hint style="info" %}
We do mean _identical_: unlike most existing JavaScript projects, you will need to include TypeScript in your dev dependencies.
{% endhint %}

Thus, installation for a JS setup looks like this:

{% tabs %}
{% tab title="Yarn" %}
```shell-session
yarn add --dev typescript @glint/core @glint/environment-ember-loose
```
{% endtab %}

{% tab title="npm" %}
```shell-session
npm install -D typescript @glint/core @glint/environment-ember-loose
```
{% endtab %}
{% endtabs %}

{% code title="jsconfig.json" %}
```javascript
{
  "compilerOptions": { /* ... */ },
  "glint": {
    "environment": "ember-loose"
  }
}
```
{% endcode %}

{% hint style="info" %}
You can also use a `tsconfig.json` file with `compilerOptions.allowJs: true`.
{% endhint %}

### Providing JS "types"

To receive equivalent rich editor support for component JS files in your project, you will need to document your components with valid JSDoc. For example:

```javascript
// SimpleComponent.js

import Component from '@glint/environment-glimmerx/component';
import { hbs } from '@glimmerx/component';
import { helper } from '@glint/environment-glimmerx/helper';

const or = helper(
  /**
   * @template T
   * @template U
   * @param {[a: T, b: U]} param
   * @returns T | U
   */
  ([a, b]) => a || b
);

/**
 * @typedef SimpleComponentSignature
 * @property {object} Args
 * @property {string} Args.message
 */

/** @extends {Component<SimpleComponentSignature>} */
export default class SimpleComponent extends Component {
  static template = hbs`
    <h1>This is my simple message: {{or @message 'hello'}}</h1>
  `;
}
```

#### Signatures

It is possible write a full `Signature` type for a JS-only component. This will provide a useful hook not only for Glint, but also for documentation tools which can consume JSDoc. Here's an example of a fully-specified `Signature` for a JS component.

{% code title="app/components/fancy-input.js" %}
```javascript
import Component from '@glimmer/component';

/**
 * @typedef FancyInputArgs
 * @property {'input' | 'textarea'} type The type of input to render
 * @property {string} value The initial value to render into the input
 * @property {(newValue: string) => void} onChange An action to run when the
 *   input's value changes
 */

/**
 * @typedef {HTMLInputElement | HTMLTextAreaElement} FancyInputElement
 */

/**
 * @typedef FancyInputBlocks
 * @property {[]} label
 */

/**
 * @typedef FancyInputSignature
 * @property {FancyInputArgs} Args
 * @property {FancyInputElement} Element
 * @property {FancyInputBlocks} Blocks
 */

/**
 * A fancy `<input>` component, with styles pre-applied and some custom
 * handling.
 *
 * @extends {Component<FancyInputSignature>}
 */
export default class FancyInput extends Component {
  // implementation...
}
```
{% endcode %}

Let's walk through this in detail. First, the `Args` to the component specify that it receives:

* a `@type` argument specifying whether to render an `<input type='text'>` or a `<textarea>`
* a `@value` argument, which should be a string
* an `@onChange` action which receives the updated value and does something with it

```javascript
/**
 * @typedef FancyInputArgs
 * @property {'input' | 'textarea'} type The type of input to render
 * @property {string} value The initial value to render into the input
 * @property {(newValue: string) => void} onChange An action to run when the
 *   input's value changes
 */
```

The `@typedef` declaration for an `Element` must be a "union" type, declaring all the different types of element to which `...attributes` might be applied, with a pipe `|` as the "or" character for the different types. Here, we can imagine that the `...attributes` are applied to the input, and since it might be an `<input>` or a `<textarea>`, we write exactly that, using the names for the corresponding JS types:

```javascript
/**
 * @typedef {HTMLInputElement | HTMLTextAreaElement} FancyInputElement
 */
```

The component also provides a named block, `label`, which does not yield any value, allowing customization of the `<label>` for the `<input>`:

```javascript
/**
 * @typedef FancyInputBlocks
 * @property {[]} label
 */
```

Finally, the component signature itself assembles those and also specifies the `Element`:

<pre class="language-javascript"><code class="lang-javascript">/**
<strong> * @typedef FancyInputSignature
</strong> * @property {FancyInputArgs} Args
 * @property {FancyInputElement} Element
 * @property {FancyInputBlocks} Blocks
 */

/**
 * A fancy `&#x3C;input>` component, with styles pre-applied and some custom
 * handling.
 *
 * @extends {Component&#x3C;FancyInputSignature>}
 */
export default class FancyInput extends Component {
  // implementation...
}</code></pre>

Now this will provide useful completion, go-to-definition, and refactoring.

#### Caveats

Undocumented component JS files will behave exactly as regular undocumented JS behaves: no information will be provided for editor support apart from what can be derived from the context.

That caveat notwithstanding, Glint still offers quite a bit even without doc comments. Type info, basic refactorings, and go-to-definition will work for anything referring to `this`, and inference based on things that do have types (built-in items Glint knows about, third-party dependencies with Glint types, etc) will work as a baseline without any extra typing.

### Type checking for JS

To allow the Glint CLI and language server to report type errors in your JS files, you can leverage [@ts-check](https://www.typescriptlang.org/docs/handbook/intro-to-js-ts.html#ts-check) on a file-by-file basis or [checkJs](https://www.typescriptlang.org/tsconfig#checkJs) in your jsconfig/tsconfig.json to enable typechecking for all JS files.
