# `@glint/core`

This package contains core functionality to power template-aware typechecking on a [glint] project. Two binaries are provided:

- `glint-language-server` - the Language Server that the VSCode (and other IDE) extension communicates with
- `ember-tsc` (see below) - a thin wrapper around TypeScript's `tsc` which provides support for .gts/.gjs files

[glint]: https://github.com/typed-ember/glint

## `ember-tsc`

The `ember-tsc` CLI tool is a thin wrapper around `tsc` and hence all documentation / use cases / flags that apply to `tsc` also apply to `ember-tsc`.

Because `ember-tsc` is only used for type-checking purposes (or generating declaration files), and not for producing compiled JS output, the emitting of JS should always be disabled by providing either the `--noEmit` or `--emitDeclarationOnly` flags, depending on your use case.

### Usage

General Usage:

```sh
ember-tsc --noEmit [--build] [--watch|-w] [--declaration|-d] [--emitDeclarationOnly] [--project path/to/tsconfig.json]
```

Type-checking:

```sh
ember-tsc [--build] --noEmit
```

Type-checking in watch mode:

```sh
ember-tsc [--build] --noEmit --watch
```

Build declaration files:

```
ember-tsc --build --declaration --emitDeclarationOnly
```

Build declaration files in watch mode:

```
ember-tsc --build --declaration --emitDeclarationOnly --watch
```

Please refer to `tsc` docs for other use cases and flags.

