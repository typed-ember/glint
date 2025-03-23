# Glint V2 (Alpha)

Glint V2 is a major refactor of Glint V1 to run atop the [Volar.js] language tooling framework, which powers the language tooling for Vue and many others.

## How to run Glint V2

_Warning: this process is very alpha and subject to change!_

We are working hard to get Glint V2 running on a wide variety of modern IDEs, with the current/initial focus to get VSCode + Neovim working before addressing others.

### VSCode

There are a few ways to try out Glint V2 in modern TS Plugin mode:

#### Download pre-release Glint from VSCode Marketplace

Glint 1.4.3+ on the VSCode Marketplace is running in modern TS Plugin mode. It can be downloaded if you opt into pre-release versions.

_Cursor users: unfortunately pre-release extensions cannot be installed into Cursor. Installing locally (described below) should work though_

#### Build Glint extension locally, install locally

- Clone the glint repo
- `pnpm`
- `pnpm build`
- `cd packages/vscode`
- `pnpm build`
- Then within VSCode:
  - Uninstall the Glint extension if it is installed
  - Run the command `Developer: Install Extension from Location`
    - Choose the `packages/vscode` folder in your cloned Glint repo
  - With this configuration, edge Glint will be running in TS Plugin mode
    - VERY SOON this will be fixed so that pre-release Marketplace extension can be used instead!

You can also experiment with `vsce package` to build a local .vsix file, unzip it to a local folder of your choice (you can just `unzip` the .vsix as it is just a .zip file in disguise), and then `Install Extension from Location` and choose the `extension/` folder within the unzipped archive.

### Neovim

TBD, perhaps something involving Coc?

## Supported Features

TBD: add a table here

## Changelog

### `glint` CLI binary

- IDE type-checking functionality has moved from Language Server into the `@glint/tsserver-plugin` TS Plugin
  - https://github.com/typed-ember/glint/commit/45026b169920d0e8f71a7750fa9dcbaf36921641
  - This follows suit with Vue Language Tooling (and internally Volar 2.0)'s decision to shift towards TS Plugin
    - Vue Tooling recently merged a [PR](https://github.com/vuejs/language-tools/pull/5248) to remove the option to toggle between legacy LS mode and new "hybrid" mode, demonstrating their commitment to TS Plugins as the stable present and future of Vue + TS tooling
  - In other words, Glint now operates in what Vue calls "Hybrid Mode"
    - "Hybrid" means that some language tooling, diagnostics, commands, etc., originate from two components that work together:
      - TypeScript functionality (diagnostics, error/warning messages, Go to Definition, etc.) is supplied by our TS Plugin, which is loaded by the same tsserver(s) that your IDE already spins up to type-check vanilla .ts files
      - Any other Ember tooling / commands will continue to be provided by the Glint Language Server
        - Caveat: given that 99% of Glint's functionality revolved around type-checking from within the Language Server, now that we've moved things to TS Plugin, there's _very little_ functionality remaining in the Glint Language Server. Perhaps it could even be removed at this point, but we are keeping it around to 1. keep our codebase as similar to Vue Tooling's codebase as possible and 2. we will likely want to add more commands/functionality to the Glint LS, or perhaps merge it into Ember Language Tooling, which will be easier to do if we keep the architecture for supporting a true "hybrid mode" in place.
  - See [ARCHITECTURE.md](./ARCHITECTURE.md) for more details on how all of these components work together.
- BREAKING CHANGE: closer unification with vanilla `tsc`
  - `glint` is now a much thinner wrapper around `tsc` and requires a number of changes to the arguments passed to it to accomplish typical tasks
    - When in doubt, think in terms of what args `tsc` would need in order to accomplish a similar task, and pass those same args to `glint`
    - to type-check your code
      - before: `glint`
      - after: `glint --noEmit`
    - to build  `.d.ts` declaration files for your .gts/.ts files
      - before: `glint --build`
      - after: `glint --declaration --emitDeclarationOnly`
- BREAKING CHANGE: `basename.gts.d.ts` files emitted instead of `basename.d.ts`
  - See discussion: https://github.com/typed-ember/glint/issues/628
  - Previously a `basename.gts` would emit a corresponding `basename.d.ts` file. For v2 glint, `basename.gts.d.ts` is emitted.

[Volar.js]: https://volarjs.dev/
