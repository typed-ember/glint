## ts-plugin-test-app

To test this out:

1. Run root tsc `yarn run tsc --build --watch`
2. Within `packages/vscode`: `yarn bundle:watch`
3. In VSCode's Run and Debug, run the "Debug Extension (TS Plugin Only)"

This causes the following:

1. New VSCode window opens up to `test-packages/ts-plugin-test-app`
2. Breakpoints will fire both in glint VSCode extension code
3. Breakpoints will fire within the vanilla tsserver, which is running the Glint TS Plugin
