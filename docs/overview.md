Glint is a set of tools to aid in developing code that uses the Glimmer VM for rendering, such as [Ember.js] (Version 3.24+) and [GlimmerX] projects. Similar to [Vetur] for Vue projects or [Svelte Language Tools], Glint consists of a CLI and a language server to provide feedback and enforce correctness both locally during editing and project-wide in CI.

## Glint CLI

Glint's CLI provides a template-aware tool for performing end-to-end TypeScript typechecking on your project.

![Command line reporting of template type errors from `glint`](https://user-images.githubusercontent.com/108688/111076577-1d61db00-84ed-11eb-876a-e5b504758d11.png)

## Glint Language Server

The Glint language server implements the standardized [Language Server Protocol], allowing it to be easily incorporated into a variety of editors. The server enables Glimmer templates to participate in your editor's rich IED features.

![Showing type information and documentation in templates on hover.](https://user-images.githubusercontent.com/108688/111069238-6eada280-84cc-11eb-9abb-c2d3af5e8976.png)

![Jumping to the definition of a component from where it's used in a template](https://user-images.githubusercontent.com/108688/111069304-b6ccc500-84cc-11eb-83b2-49681b248cbe.png)

![Locating all uses of a given component in a project](https://user-images.githubusercontent.com/108688/111070826-c6034100-84d3-11eb-9c12-e8e80e168940.png)

![Suggesting component arguments in typeahead with type information and documentation](https://user-images.githubusercontent.com/108688/111070948-3f9b2f00-84d4-11eb-9eaa-077cadf6f380.png)

## Stability Note

{% hint style="warning" %}
Note: **Glint is still under active development!** Please bear with us and expect breaking changes and rough edges as we work toward a stable release. Also note that Glint is currently only compatible with TypeScript projects, but our aim is ultimately to support JavaScript as well, as TypeScript's tooling can provide best-in-class support for both TS and JS projects.
{% endhint %}

[ember.js]: https://www.emberjs.com
[glimmerx]: https://github.com/glimmerjs/glimmer-experimental
[vetur]: https://github.com/vuejs/vetur
[svelte language tools]: https://github.com/sveltejs/language-tools
[language server protocol]: https://microsoft.github.io/language-server-protocol/
