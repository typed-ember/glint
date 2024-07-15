## ts-plugin-test-app

To test this out:

1. Run root tsc `yarn run tsc --build --watch`
2. Within `packages/vscode`: `yarn bundle:watch`
3. In VSCode's Run and Debug, run the "Debug Extension (TS Plugin Only)"
5. Navigate to `test.ts`; this will fully activate the vanilla VSCode TS language tooling, which has the side-effect of loading our Ember TS Plugin.
6. You may need to run the command `TypeScript: Select TypeScript Version` and set it to the workspace. You might need to do this every time you re-start the debug process.
7. Open `glimmer.gts` and see if you can get diagnostics/tooling working (doesn't work yet)
8. To see the tsserver log, _navigate back to `test.ts` and run command `TypeScript: Open TS Server Log`.

With this debug setup, the following happens:

1. New VSCode window opens up to `test-packages/ts-plugin-test-app`
2. Breakpoints will fire both in glint VSCode extension code
3. Breakpoints will fire within the vanilla tsserver, which is running the Glint TS Plugin
