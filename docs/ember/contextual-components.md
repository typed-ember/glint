When you yield a contextual component, e.g. `{{yield (component "my-component" foo="bar")}}`, you need some way to declare the type of that value in your component signature. For this you can use the `ComponentLike` type, or the `ComponentWithBoundArgs` shorthand.

```typescript
interface MyComponentSignature {
  Element: HTMLInputElement;
  Args: {
    value: string;
    count: number;
  };
}

class MyComponent extends Component<MyComponentSignature> {
  // ...
}
```

Given a component like the one declared above, if you wrote this in some other component's template:

```handlebars
{{yield (hash foo=(component 'my-component'))}}
```

You could type your `Yields` as:

```typescript
Yields: {
  default: [{ foo: typeof MyComponent }]
}
```

However, if you pre-set the value of the `@value` arg, the consumer shouldn't _also_ need to set that arg. You need a way to declare that that argument is now optional:

```typescript
import { ComponentWithBoundArgs } from '@glint/environment-ember-loose';

// ...

Yields: {
  default: [{ foo: ComponentWithBoundArgs<typeof MyComponent, 'value'> }]
}
```

If you had pre-bound multiple args, you could union them together with the `|` type operator, e.g. `'value' | 'count'`.

Note that `ComponentWithBoundArgs` is effectively shorthand for writing out a `ComponentLike<Signature>` type, which is a generic type that any Glimmer component, Ember component or `{{component}}` return value is assignable to, assuming it has a matching signature.

```typescript
import { ComponentLike } from '@glint/environment-ember-loose';

type AcceptsAFooString = ComponentLike<{ Args: { foo: string } }>;

const Ember: AcceptsAFooString = class extends EmberComponent<{ Args: { foo: string } }> {};
const Glimmer: AcceptsAFooString = class extends GlimmerComponent<{ Args: { foo: string } }> {};
const Bound: AcceptsAFooString = /* the result of `{{component "ember-component"}}` */
```
