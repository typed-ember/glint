In order for GlimmerX entities to be interpretable by Glint, you currently need to use Glint-specific import paths for `@glimmer/component`, `@ember/component` and `ember-modifier`. Note that this is not a long-term restriction, but a temporary workaround for the current state of the ecosystem.

| Vanilla Ember                    | Ember + Glint                                                  |
| -------------------------------- | -------------------------------------------------------------- |
| `@glimmer/component`             | `@glint/environment-ember-loose/glimmer-component`             |
| `@ember/component`               | `@glint/environment-ember-loose/ember-component`               |
| `@ember/component/helper`        | `@glint/environment-ember-loose/ember-component/helper`        |
| `@ember/component/template-only` | `@glint/environment-ember-loose/ember-component/template-only` |
| `ember-modifier`                 | `@glint/environment-ember-loose/ember-modifier`                |
