While GlimmerX components accept `Args` as a type parameter, the Glint version accepts `Signature`, which contains types for `Element`, `Args` and `Yields`.

The `Element` field declares what type of element(s), if any, the component applies its passed `...attributes` to. This is often the component's root element. Tracking this type ensures any modifiers used on your component will be compatible with the DOM element(s) they're ultimately attached to. If no `Element` is specified, it will be a type error to set any HTML attributes when invoking your component.

The `Yields` field specifies the names of any blocks the component yields to, as well as the type of any parameter(s) they'll receive. See the [Yieldable Named Blocks RFC] for further details.
(Note that the `inverse` block is an alias for `else`. These should be defined in `Yields` as `else`, though `{{yield to="inverse"}}` will continue to work.)

```typescript
import Component from '@glint/environment-glimmerx/component';
import { hbs } from '@glimmerx/component';

export interface ShoutSignature {
  // We have a `<div>` as our root element
  Element: HTMLDivElement;
  // We accept one required argument, `message`
  Args: {
    message: string;
  };
  // We yield a single string to the default block, `shoutedMessage`
  Yields: {
    default?: [shoutedMessage: string];
  };
}

export class Shout extends Component<ShoutSignature> {
  private get louderPlease() {
    return `${this.args.message.toUpperCase()}!`;
  }

  public static template = hbs`
    <div ...attributes>
      {{yield this.louderPlease}}
    </div>
  `;
}
```

[yieldable named blocks rfc]: https://github.com/emberjs/rfcs/blob/master/text/0460-yieldable-named-blocks.md
