In order for GlimmerX entities to be interpretable by Glint, you currently need to use Glint-specific import paths for `@glimmerx/modifier`, `@glimmerx/helper` and `@glimmerx/component`. Note that this is not a long-term restriction, but a temporary workaround for the current state of the ecosystem.

| Vanilla GlimmerX      | GlimmerX + Glint                        |
| --------------------- | --------------------------------------- |
| `@glimmerx/component` | `@glint/environment-glimmerx/component` |
| `@glimmerx/modifier`  | `@glint/environment-glimmerx/modifier`  |
| `@glimmerx/helper`    | `@glint/environment-glimmerx/helper`    |

**Note**: because of the way `@glimmerx/babel-plugin-component-templates` currently works, you must still import `hbs` from `@glimmerx/component` or your templates will not be compiled.
