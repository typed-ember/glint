# `@glint/core`

This package contains core functionality to power template-aware typechecking on a [glint] project.

[glint]: https://github.com/typed-ember/glint

## CLI

The `glint` CLI tool is a thin wrapper around `tsc` and hence all documentation / use cases / flags that apply to `tsc` also apply to `glint`.

Because `glint` is only used for type-checking purposes (or generating declaration files), and not for producing compiled JS output, the emitting of JS should always be disabled by providing either the `--noEmit` or `--emitDeclarationOnly` flags, depending on your use case.

### Usage

Gemeral Usage:

```sh
glint --noEmit [--build] [--watch|-w] [--declaration|-d] [--emitDeclarationOnly] [--project path/to/tsconfig.json]
```

Type-checking:

```sh
glint [--build] --noEmit
```

Type-checking in watch mode:

```sh
glint [--build] --noEmit --watch
```

Build declaration files:

```
glint --build --declaration --emitDeclarationOnly
```

Build declaration files in watch mode:

```
glint --build --declaration --emitDeclarationOnly --watch
```

Please refer to `tsc` docs for other use cases and flags.

