# Glint V2 (Alpha)

Glint V2 is a major refactor of Glint V1 to run atop the [Volar.js] language tooling framework, which powers the language tooling for Vue and many others.

## How to run Glint V2

_Warning: this process is very alpha and subject to change!_

We are working hard to get Glint V2 running on a wide variety of modern IDEs, with the current/initial focus to get VSCode + Neovim working before addressing others.

### VSCode prerelease Marketplace extension
Install the pre-release [Marketplace Glint extension](https://marketplace.visualstudio.com/items?itemName=typed-ember.glint-vscode) v1.4.3 (as of March 23 2025).
Note that if you have used previous versions of Glint and have disabled the `@builtin typescript` extension, you can now enable it again.

### Building the VSCode extension from source
If you want to try out edge Glint in VSCode (with TS-Plugin-driven tooling) with your own built version of the extension:
  - Clone the glint repo
  - `pnpm install`
  - `pnpm build`
  - `cd packages/vscode`
  - `pnpm build`
  - Then within VSCode:
    - Uninstall the Glint extension if it is installed
    - Run the command `Developer: Install Extension from Location`
      - Choose the `packages/vscode` folder in your cloned Glint repo
    - With this configuration, edge Glint will be running in TS Plugin mode

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
