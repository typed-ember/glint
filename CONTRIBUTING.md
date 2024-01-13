# Contributing

We welcome contributions to Glint! To help us help you be successful, please follow this basic approach:

- For bugs, please [file an issue](https://github.com/typed-ember/glint/issues/new) before opening a PR to fix it.
- For a feature idea, please [start a discussion](https://github.com/typed-ember/glint/discussions/categories/ideas) before opening a PR to implement it.
- For questions, please [start a discussion](https://github.com/typed-ember/glint/discussions/categories/q-a) rather than filing an issue.

## Working on the project

Glint is a family of packages which all live in this repo as a Yarn workspace. To be most successful here, you should:

- Install [Volta](https://volta.sh), a JavaScript toolchain manager we use to make sure everyone working on the project is using the same versions of Node and Yarn.
- Clone the repo.
- Run `yarn` in the root of the repo to install all the package dependencies. If you have Volta installed, it will automatically fetch and use the correct versions of Node and Yarn for you.
- Run `yarn build` in the root of the repository to build all of the projects the first time. This will make sure that once you start working on one of the packages, you are working with an up to date version of the other packages in the project it depends on.
- Read the project’s [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the basics of how the code base works.

Once you have made changes and added tests to confirm they work correctly, you can then open a PR and we'll work with you to polish it up and get it landed!

# Common Debugging Scenarios

## How to run glint-language-server locally?

If you would like to connect your editor to a locally running version of the Glint language server, first start the `tsc` compiler in watch mode from the root folder of the Glint repo:

```
tsc --build --watch
```

Then you can configure your editor to point to the absolute path of the `./packages/core` folder within this repo when launching the language server. For VSCode users, this means opening your user preferences (after having already installed the Glint VSCode extension) and setting "Glint: Library Path" (aka `glint.libraryPath`) to the absolute path of the `packages/core` folder, e.g. `/Users/machty/code/glint/packages/core`.

With the running `tsc --build --watch` command, the language server will rebuild when any source code files change. _Important_: after any source code file change and subsequent rebuild, you will need to restart the language server from within your editor in order for the changes to be reflected in your editor. In VSCode, this means running "Glint: Restart Glint Server" from the Command Palette.

## How to run glint-language-server locally in debug mode?

There are a few VSCode Launch Configurations within `./vscode/launch.json` that are handy for debugging:

- Both will enable the TS/JS debugger on both the language server and the client-side VSCode extension code, meaning the debug breakpoints will pause execution to allow you to debug things like text completions
- Debug Extension (Glint + TS)
  - This spins up a VSCode window with both Glint and the built-in TS language server running.
  - In this mode, both language servers will provide duplicate completions and suggestions, which can be useful for testing out feature parity between Glint and TS
- Debug Extension (Glint Only)
  - This is useful for testing out the "takeover" mode of running Glint, where Glint is responsible for providing all of the language features (debugging, diagnostics, etc); this is the ideal way to run Glint, but at the time of writing we have not yet achieved feature parity with built-in TS
- By default these extensions will launch the VSCode Extension Host in the `test-packages` subfolder, which have Ember and Glimmerx apps that you can do some basic testing on
- _TIP_: you can open any workspace with the Extension Host, meaning you can even debug the language server with breakpoints on a totally separate Ember repo, for example.
- _NOTE_: debugging takes place within the `glint` workspace, i.e. if you are debugging completions, you'd trigger a completion within the Extension Host, and the breakpoint would pause within the Glint workspace VSCode instance.

These launch configurations can be run via the Run and Debug tab in VSCode.

## How to test out the VSCode extension locally?

Firstly, there is an entire suite of integration tests that will spin up instances of VSCode and test out the VSCode Glint extension. These can be run from the `packages/vscode` directory via:

```
yarn run test
```

Secondly, the Launch Configurations described above (I believe) will run your client-side extension code in debug mode, along with the language server.
