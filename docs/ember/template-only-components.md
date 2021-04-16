A template-only component is any template for which Ember (and Glint) can't locate a backing TS or JS module. In Glint, these are treated very similarly to a component with an empty signature: it has no args, and it can't yield to blocks or apply `...attributes` anywhere. Additionally, the value of `{{this}}` in such a template will be `void`.

While it's possible to do some simple things like invoking other components from these templates, typically you'll want to create a backing module for your template so you can declare its signature, add it to the template registry, and so on.

```typescript
import templateOnlyComponent from '@glint/environment-ember-loose/ember-component/template-only';

interface ShoutSignature {
  Element: HTMLDivElement;
  Args: { message: string };
  Yields: {
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
