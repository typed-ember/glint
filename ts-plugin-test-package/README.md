A convenient test folders for trying out the TS Plugin. This folder is intended to be more isolated from the other packages in the glint repo and is intentionally not included as a yarn workspace because:

- VSCode needs `typescript` to not be hoisted out of the this directory's `node_modules`
- TS Plugin might also have similar constraints, not sure

I may find a better way and delete this.

## Debugging tsserver

1. Spin up a new VSCode workspace with tsserver set up for debugging:

```sh
TSS_DEBUG_BRK=5667 code --user-data-dir ~/.vscode-debug/ ts-plugin-test-package
```

2. In the _new_ window, open a TS file, e.g. `src/test.ts`. This will activate the TypeScript extension and spin up the tsserver, which will pause on a breakpoint at start due to `TSS_DEBUG_BRK`.

3. In the _original_ VSCode window, go to Run and Debug and start the "Attach to TS Server" task. This should immediately pause at the beginning of the tsserver.js script, which is running within the new debug VSCode window you opened up.

TODO: see if there's a way to configure a task to combine both of these steps? Seems possible.
