Your app likely uses a lot of addons, and most will not ship with Glint-compatible types yet. With modern `.gts`/`.gjs` files, you handle addon types by explicitly importing the components, helpers, and modifiers you need.

The community has begun maintaining a shared [`glint-template-types`] repository with Glint-compatible type declarations for commonly used Ember addons. The README there contains information about how to take advantage of these shared declarations for addons you may use in your Ember projects.

## Using Addons with .gts/.gjs Files

With modern `.gts`/`.gjs` files, you explicitly import what you need from addons, just like any other JavaScript module:

{% code title="app/components/my-component.gts" %}

```typescript
import Component from '@glimmer/component';
import { pageTitle } from 'ember-page-title/helpers/page-title';
import WelcomePage from 'my-addon/components/welcome-page';

export default class MyComponent extends Component {
  <template>
    {{pageTitle 'MyApp'}}
    
    <WelcomePage />
    
    {{outlet}}
  </template>
}
```

{% endcode %}

This approach provides better type safety and makes dependencies explicit.

## Using Glint-enabled addons

For addons that already ship with Glint-compatible types, you simply import what you need directly in your `.gts`/`.gjs` files:

{% code title="app/components/my-gallery.gts" %}

```typescript
import Component from '@glimmer/component';
import ResponsiveImage from 'ember-responsive-image/components/responsive-image';

interface MyGallerySignature {
  Args: {
    images: Array<{ src: string; alt: string }>;
  };
}

export default class MyGallery extends Component<MyGallerySignature> {
  <template>
    <div class="gallery">
      {{#each @images as |image|}}
        <ResponsiveImage @src={{image.src}} @alt={{image.alt}} />
      {{/each}}
    </div>
  </template>
}
```

{% endcode %}

This explicit import approach provides better type safety, clearer dependencies, and works seamlessly with modern JavaScript tooling.

[`glint-template-types`]: https://github.com/Gavant/glint-template-types
[authoring]: authoring-addons.md
[strict mode]: http://emberjs.github.io/rfcs/0496-handlebars-strict-mode.html
[first class component templates]: http://emberjs.github.io/rfcs/0779-first-class-component-templates.html

