# Glint VS Code Extension

A Visual Studio Code extension for the [Glint] language server.

[glint]: https://github.com/typed-ember/glint

## Setup

See the [Glint home page] for a more detailed Getting Started guide.

1. Add `@glint/core`, `@glint/template` and an appropriate environment package to your project's `devDependencies`.
1. Add a `"glint"` key to your project's `tsconfig.json` or `jsconfig.json` specifying your environment and any other relevant configuration.
1. Consider disabling the built-in `vscode.typescript-language-features` extension for any workspaces where you use Glint to avoid extraneous diagnostics. <details><summary>Screenshot</summary>
<img src="https://user-images.githubusercontent.com/108688/111069039-6dc84100-84cb-11eb-8339-18a589be2ac5.png" width="500">
</details>

[glint home page]: https://typed-ember.gitbook.io/glint

## Usage

The Glint language server incorporates Glimmer templates into TypeScript-powered tooling for a project, enabling them to participate in rich editor features such as:

- Quickinfo on hover:
  <br>
  <img src="https://user-images.githubusercontent.com/108688/111069238-6eada280-84cc-11eb-9abb-c2d3af5e8976.png" width="590" alt="Signature information being shown on hover for a component's named block">
- Go to definition:
  <br>
  <img src="https://user-images.githubusercontent.com/108688/111069304-b6ccc500-84cc-11eb-83b2-49681b248cbe.png" width="912" alt="The definition for a component being shown from the site of its invocation in a template">
- Symbol renaming:
  <br>
  <img src="https://user-images.githubusercontent.com/108688/111070668-ff877c80-84d2-11eb-9a5a-57ae9be7fe2a.gif" width="447" alt="Fields on an object being renamed and having their other uses updated to match">
- Find references:
  <br>
  <img src="https://user-images.githubusercontent.com/108688/111070826-c6034100-84d3-11eb-9c12-e8e80e168940.png" width="931" alt="Template snippets where a component is used being shown from the site of its declaration">
- Completions:
  <br>
  <img src="https://user-images.githubusercontent.com/108688/111070948-3f9b2f00-84d4-11eb-9eaa-077cadf6f380.png" width="1010" alt="Component arguments being suggested with type information and documentation">
