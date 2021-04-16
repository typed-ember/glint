In GlimmerX, standalone templates can be invoked as components. Like class-based components, you can declare a signature for a template component in order for Glint to understand how it can be used.

The class-based component above could as a template component like so:

```typescript
import type { TemplateComponent } from '@glint/environment-glimmerx/component';

interface ShoutSignature {
  /* same as above */
}

const shout = (message: string) => `${message.toUpperCase()}!`;

const Shout: TemplateComponent<ShoutSignature> = hbs`
  <div ...attributes>
    {{yield (shout @message)}}
  </div>
`;
```

Note that, similar to React's `FunctionComponent` and `FC`, you can also import and use the `TC` type alias as a shorthand for `TemplateComponent`:

```typescript
import type { TC } from '@glint/environment-glimmerx/component';
```
