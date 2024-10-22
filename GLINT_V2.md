# Glint V2 (Alpha)

Glint V2 is a major refactor of Glint V1 to run atop the [Volar.js language tooling framework], which powers the language tooling for Vue and many others.

## Supported Features

At the time of writing, the only component formats supported by Glint 2 are **.gts/.gjs components**; classic two-file (.ts/.js file + .hbs) components are not yet supported (neither class Ember components or nor Glimmer components), but support for these "classic" components is coming soon.

TODO: link to roadmap here.

[Volar.js language tooling framework]: https://volarjs.dev/

## Changelog

### `glint` CLI binary

- BREAKING CHANGE: closer unification with vanilla `tsc`
  - `glint` is now a much more thin wrapper around `tsc` and requires a number of changes to the arguments passed to it to accomplish typical tasks
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
