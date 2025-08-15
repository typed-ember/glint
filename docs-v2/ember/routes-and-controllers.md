Templates associated with Ember routes and/or controllers will be typechecked against those backing classes without needing to import from Glint-specific paths.

If a controller class exists, then `@model` in the corresponding template will have the type of the controller's declared `model` property, and `{{this}}` will be the type of the controller itself.

```typescript
export default class MyController extends Controller {
  declare model: MyModelType;

  greeting = 'Hello, world!';
}
```

<!-- prettier-ignore -->
```handlebars
{{this}} {{! MyController }}
{{this.greeting}} {{! string }}
{{this.model}} {{! MyModelType }}
{{@model}} {{! MyModelType }}
```

If no controller exists but a route does, then `{{@model}}` will be the return type of the route's `model()` hook (unwrapping any promise if necessary), and `{{this}}` will be the type of an empty controller with a `model` property of the same type as `@model`.

```typescript
export default class MyRoute extends Route {
  async model(): Promise<MyModelType> {
    // ...
  }
}
```

<!-- prettier-ignore -->
```handlebars
{{this}} {{! Controller & { model: MyModelType } }}
{{this.model}} {{! MyModelType }}
{{@model}} {{! MyModelType }}
```

For `error` substate routes, the type of `{{@model}}` will not be automatically inferred. You will need to create a backing class for the route if you consume its model in the corresponding template:

```typescript
export default class ErrorRoute extends Route<Error> {
  // ...
}
```

<!-- prettier-ignore -->
```handlebars
{{@model}} {{! Error }}
```