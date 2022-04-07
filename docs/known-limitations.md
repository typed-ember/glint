**Glint is not yet stable** and is still under active development. As such, there are currently several known limitations to be aware of.

### Environment Re-exports

Currently, users must import Glint-aware versions of `Component` and other values that are re-exported from their Glint environment rather than being able to directly use the "native" versions. The details of this requirement are explained in dedicated environment-specific `Imports` pages.

This is not a permanent limitation, but rather a result of the base types for those entities not (yet) being extensible in the ways necessary to capture their template behavior. As we're able to make adjustments to those upstream types across the ecosystem to ensure they're extensible, we should be able to shift to use declaration merging instead of completely re-exporting.

Once that's done, consumers should be able to import values the "normal" way directly from the sources packages like `@glimmer/component`.

### Ember-Specific

Glint is not currently integrated with `ember-cli-typescript`, so typechecking performed during an `ember-cli` build will not take templates into account.

In addition, the [template registry](ember/template-registry.md) must currently be maintained by hand. A few possibilities for mitigating that pain have been discussed, but ultimately the best solution will be when [strict mode] comes to Ember and we no longer need to reckon with runtime resolution of template entities.

[strict mode]: http://emberjs.github.io/rfcs/0496-handlebars-strict-mode.html

### Tooling

The CLI and language server currently have a few known limitations:

- The CLI does not yet support composite projects or `tsc`'s `--build` mode.
- The language server will only operate on projects with a `.glintrc` at their root, not in a subdirectories of the workspace root.
- In VS Code, you will see diagnostics from both TypeScript and Glint in many files, as well as false 'unused symbol' positives for things only referenced in templates. See [the VS Code extension README](packages/vscode) for details on dealing with this.
