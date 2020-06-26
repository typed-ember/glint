# `@glint/cli`

This package contains a CLI to execute template-aware typechecking on a [glint] project.

[glint]: https://github.com/typed-ember/glint

## Usage

```sh
glint [--watch|-w] [--declaration|-d] [--project path/to/tsconfig.json]
```

## Flags

- `--watch` If passed, `glint` will perform a watched typecheck, re-checking your project as files change.
- `--declaration` If passed, `glint` will emit `.d.ts` files according to the configuration in your `tsconfig.json`
- `--project` Overrides where `glint` will look to find your project's `tsconfig.json`
