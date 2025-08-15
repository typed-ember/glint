Adding Glint support to TypeScript-based addons provides significant value for both addon authors and consumers.

First, the addon itself benefits from additional typing coverage, as all templates in rendering tests or the dummy app get type checked, increasing type safety and decreasing the likelihood of type inconsistencies.

Second, it makes consuming the addon much easier for Glint-enabled apps, providing proper Glint-compatible types out of the box.

## Publishing addons with Glint types

The recommended approach for modern addons is to use `.gts`/`.gjs` files with proper signature types. This provides the best developer experience and type safety.

With modern `.gts`/`.gjs` files, consumers simply import what they need directly from your addon:

{% code title="app/components/my-component.gts" %}

```typescript
import Component from '@glimmer/component';
import { AwesomeButton } from 'awesome-addon/components/awesome-button';
import { AwesomeModal } from 'awesome-addon/components/awesome-modal';

export default class MyComponent extends Component {
  <template>
    <AwesomeButton @onClick={{this.handleClick}}>
      Click me!
    </AwesomeButton>
    
    <AwesomeModal @isOpen={{this.showModal}}>
      Modal content here
    </AwesomeModal>
  </template>
}
```

{% endcode %}

This explicit import approach provides better type safety, clearer dependencies, and aligns with modern JavaScript module patterns.

## Adding Glint types to addons not written in TypeScript

Even if an addon author has chosen not to adopt TypeScript, the addon can still ship Glint types! You'll need to create declaration files for your components, helpers, and modifiers.

{% code title="/components/awesome-button.d.ts" %}

```typescript
import Component from '@glimmer/component';

interface AwesomeButtonSignature {
  Element: HTMLButtonElement;
  Args: {
    label: string;
  };
}

export default class AwesomeButton extends Component<AwesomeButtonSignature> {}
```

{% endcode %}

{% code title="/helpers/awesome-sauce.d.ts" %}

```typescript
import Helper from '@ember/component/helper';

interface AwesomeSauceSignature {
  Args: {
    Positional: [string];
  };
  Return: string;
}

export default class AwesomeSauce extends Helper<AwesomeSauceSignature> {}
```

{% endcode %}

With these declaration files in place, consumers can import and use your addon's components directly in their `.gts`/`.gjs` files with full type safety.

[strict mode]: http://emberjs.github.io/rfcs/0496-handlebars-strict-mode.html
[first class component templates]: http://emberjs.github.io/rfcs/0779-first-class-component-templates.html

[using addons]: using-addons.md
[ect]: https://github.com/typed-ember/ember-cli-typescript
[eri]: https://github.com/kaliber5/ember-responsive-image
