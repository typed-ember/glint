# `@glint/core`

This package contains core functionality to power template-aware typechecking on a [glint] project.

[glint]: https://github.com/typed-ember/glint

## CLI

### Usage

```sh
glint [--watch|-w] [--declaration|-d] [--project path/to/tsconfig.json]
```

### Flags

- `--watch` If passed, `glint` will perform a watched typecheck, re-checking your project as files change.
- `--preserveWatchOutput` Used with `--watch`. If passed, `glint` will not clear the screen each time the project is re-checked.
- `--declaration` If passed, `glint` will emit `.d.ts` files according to the configuration in your `tsconfig.json`
- `--project` Overrides where `glint` will look to find your project's `tsconfig.json`
