**Glint is not yet stable** and is still under active development. As such, there are currently several known limitations to be aware of.

### Ember-Specific

Glint is not currently integrated with `ember-cli-typescript`, so typechecking performed during an `ember-cli` build will not take templates into account.

In addition, the [template registry](ember/template-registry.md) must currently be maintained by hand. A few possibilities for mitigating that pain have been discussed, but ultimately the best solution will be when [strict mode] comes to Ember and we no longer need to reckon with runtime resolution of template entities.

[strict mode]: http://emberjs.github.io/rfcs/0496-handlebars-strict-mode.html

### Tooling

In VS Code, you will see diagnostics from both TypeScript and Glint in many files, as well as false 'unused symbol' positives for things only referenced in templates. See [the VS Code extension README](../packages/vscode) for details on dealing with this.
