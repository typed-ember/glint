# Changes since v2 (Volar-ized Glint)

## `glint` CLI binary

- BREAKING CHANGE: closer unification with vanilla `tsc`
  - `glint` is now a much more thin wrapper around `tsc` and requires a number of changes to the arguments passed to it to accomplish typical tasks
    - When in doubt, think in terms of what args `tsc` would need in order to accomplish a similar task, and pass those same args to `glint`
    - to type-check your code
      - before: `glint`
      - after: `glint --noEmit`
    - to build  `.d.ts` declaration files for your .gts/.ts files
      - before: `glint --build`
      - after: `glint --declaration --emitDeclarationOnly`