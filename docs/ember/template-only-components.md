A template-only component is any template for which Ember (and Glint) can't locate a backing TS or JS module. In Glint, these are treated very similarly to a component with an empty signature: it has no args, and it can't yield to blocks or apply `...attributes` anywhere. Additionally, the value of `{{this}}` in such a template will be `void`.

While it's possible to do some simple things like invoking other components from these templates, typically you'll want to create a backing module for your template so you can declare its signature, add it to the template registry, and so on.

```typescript
import templateOnlyComponent from '@ember/component/template-only';

interface ShoutSignature {
  Element: HTMLDivElement;
  Args: { message: string };
  Blocks: {
    default: [shoutedMessage: string];
  };
}

const Shout = templateOnlyComponent<ShoutSignature>();

export default Shout;

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    Shout: typeof Shout;
  }
}
```

Note that the runtime content of this module (effectively `export default templateOnlyComponent();`) is exactly what Ember generates at build time when creating a backing module for a template-only component.

Additionally, you can create a backing module using the `TOC` type, which is a convenience alias for `templateOnlyComponent`.

```typescript
import type { TOC } From '@ember/component/template-only';

interface ShoutSignature {
  Element: HTMLDivElement;
  Args: { message: string };
  Blocks: {
    default: [shoutedMessage: string];
  };
}

declare const Shout: TOC<ShoutSignature>;
export default Shout;
```

Due to the way TypeScript works, it's not possible to have a generic signature for template-only components:

```typescript
import templateOnlyComponent from '@ember/component/template-only';

interface ShoutSignature<T> {
  Args: { message: T };
  Blocks: {
    default: [shoutedMessage: T];
  };
}

const Shout = templateOnlyComponent<ShoutSignature<???>>();
```

If that's needed, you must create an (empty) backing class:

```typescript
import Component from '@glimmer/component';

interface ShoutSignature<T> {
  // same as above
}

export default class Shout<T> extends Component<ShoutSignature<T>> {}
```
