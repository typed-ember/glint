Like components, helpers and modifiers can also have their behavior in templates described by a `Signature` type.

## Helpers

A helper signature has two keys: `Args` and `Return`. The `Args` key is further broken down into `Named` and
`Positional` elements, representing respectively the expected types of the named and positional arguments your helper
expects to receive.

{% tabs %}
{% tab title="Class-Based" %}

```typescript
import Helper from '@ember/component/helper';

type Positional = Array<number>;
type Named = { andThenMultiplyBy?: number };

export interface AddSignature {
  Args: {
    Positional: Positional;
    Named: Named;
  };
  Return: number;
}

export default class AddHelper extends Helper<AddSignature> {
  public compute(positional: Positional, named: Named): number {
    let total = positional.reduce((sum, next) => sum + next, 0);
    if (typeof named.andThenMultiplyBy === 'number') {
      total *= named.andThenMultiplyBy;
    }
    return total;
  }
}
```

{% endtab %}
{% tab title="Function-Based" %}

```typescript
import { helper } from '@ember/component/helper';

export interface AddSignature {
  Args: {
    Positional: Array<number>;
    Named: { andThenMultiplyBy?: number };
  };
  Return: number;
}

const add = helper<AddSignature>((values, { andThenMultiplyBy }) => {
  let total = positional.reduce((sum, next) => sum + next, 0);
  if (typeof andThenMultiplyBy === 'number') {
    total *= andThenMultiplyBy;
  }
  return total;
});

export default add;
```

{% endtab %}
{% tab title="Function-Based (Inferred Signature)" %}

```typescript
import { helper } from '@ember/component/helper';

const add = helper((values: Array<number>, named: { andThenMultiplyBy?: number }) => {
  let total = positional.reduce((sum, next) => sum + next, 0);
  if (typeof named.andThenMultiplyBy === 'number') {
    total *= named.andThenMultiplyBy;
  }
  return total;
});

export default add;
```

{% endtab %}
{% endtabs %}

## Modifiers

A modifier's `Args` are split into `Named` and `Positional` as with helpers, but unlike helpers they have no `Return`,
since modifiers don't return a value. Their signtures can, however, specify the type of DOM `Element` they are
compatible with.

{% tabs %}
{% tab title="Class-Based" %}

```typescript
import Modifier from 'ember-modifier';
import { renderToCanvas, VertexArray, RenderOptions } from 'neat-webgl-library';

type Positional = [model: VertexArray];

export interface Render3DModelSignature {
  Element: HTMLCanvasElement;
  Args: {
    Positional: Positional;
    Named: RenderOptions;
  };
}

export default class Render3DModel extends Modifier<Render3DModelSignature> {
  modify(element: HTMLCanvasElement, [model]: Positional, named: RenderOptions) {
    renderToCanvas(element, model, options);
  }
}
```

{% endtab %}
{% tab title="Function-Based" %}

```typescript
import { modifier } from 'ember-modifier';
import { renderToCanvas, RenderOptions, VertexArray } from 'neat-webgl-library';

export interface Render3DModelSignature {
  Element: HTMLCanvasElement;
  Args: {
    Positional: [model: VertexArray];
    Named: RenderOptions;
  };
}

const render3DModel = modifier<Render3DModelSignature>((element, [model], options) => {
  renderToCanvas(element, model, options);
});

export default render3DModel;
```

{% endtab %}
{% tab title="Function-Based (Inferred Signature)" %}

```typescript
import { modifier } from 'ember-modifier';
import { renderToCanvas, RenderOptions, VertexArray } from 'neat-webgl-library';

const render3DModel = modifier<Render3DModelSignature>(
  (element: HTMLCanvasElement, [model]: [model: VertexArray], options: RenderOptions): void => {
    renderToCanvas(element, model, options);
  }
);

export default render3DModel;
```

{% endtab %}
{% endtabs %}
