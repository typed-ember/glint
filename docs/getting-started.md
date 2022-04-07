## Setup

You'll first need to add `@glint/core` and an appropriate Glint environment to your project's `devDependencies`.
Check the section in the sidebar to the left for details about the specifics of working with Glint in a GlimmerX or Ember.js project.

Next, you'll add a `.glintrc.yml` file to the root of your project (typically alongside your `tsconfig.json` file). This file tells Glint what environment you're working in and, optionally, which files it should include in its typechecking:

{% code title=".glintrc.yml" %}

```yaml
environment: a-glint-environment
include:
  - 'app/**'
```

{% endcode %}

Finally, you may choose to install an editor extension to display Glint's diagnostics inline in your templates and provide richer editor support, such as the [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=typed-ember.glint-vscode).

## Using Glint

The `@glint/core` package includes two executables: `glint` and `glint-language-server`.

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

Similarly, `glint-language-server` can be used by editor integrations to expose that same information inline as you type.

![A type error being shown inline for a template file in VS Code](https://user-images.githubusercontent.com/108688/111076679-995c2300-84ed-11eb-934a-3a29f21be89a.png)

The language server can also enable your editor to provide other richer help, such as type information on hover, automated refactoring, and more. See [the VS Code extension README](https://github.com/typed-ember/glint/tree/main/packages/vscode) for further examples.
