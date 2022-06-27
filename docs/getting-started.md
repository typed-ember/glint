## Setup

First, add `@glint/core` and an appropriate Glint environment to your project's `devDependencies`.

Then, add a `"glint"` key in your `tsconfig.json` that tells Glint what environment you're working in and, optionally, which files it should include in its typechecking.

See the [Configuration](configuration.md) page for more details about options you can specify under the `"glint"` key. For setup instructions specific to your project type, check out the links below:

- [GlimmerX Installation](glimmerx/installation.md)
- [Ember.js Installation](ember/installation.md)

## Using Glint

The `@glint/core` package includes two executables: `glint` and `glint-language-server`.

### Glint CLI

The `glint` CLI can be used to typecheck your project in a similar manner to `tsc`, but with understanding of how values flow through templates.

![A `tsc`-style template type error in the terminal](https://user-images.githubusercontent.com/108688/111076577-1d61db00-84ed-11eb-876a-e5b504758d11.png)

You can use the `glint` executable in CI to ensure you maintain type safety in your templates.

For example, in GitHub Actions you might change this:

```yaml
- name: Typecheck
  run: npx tsc --noEmit
```

To this:

```yaml
- name: Typecheck
  run: npx glint
```

You can also use the `glint` command locally with the `--watch` flag to monitor your project as you work!

### Glint Editor Extensions

You can install an editor extension to display Glint's diagnostics inline in your templates and provide richer editor support&mdash;typechecking, type information on hover, automated refactoring, and more&mdash;powered by `glint-language-server`:

- Install the [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=typed-ember.glint-vscode).
- Learn more about the [Glint Language Server](glint-language-server.md).

![A type error being shown inline for a template file in VS Code](https://user-images.githubusercontent.com/108688/111076679-995c2300-84ed-11eb-934a-3a29f21be89a.png)
