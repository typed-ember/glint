# Glint scripts

A handful of tools for working with Glint—e.g. for migrations.

- [Usage](#usage)
- [Scripts](#scripts)
  - [`migrate-glintrc`](#migrate-glintrc)
  - [`auto-glint-nocheck`](#auto-glint-nocheck)

## Usage

Each script can be invoked either directly from the npm registry with `npx`:

```sh
npx -p @glint/scripts {script-name} {...script-args}
```

Or by installing `@glint/scripts` as a project-local dependency and then executing a script directly:

```sh
npm install -D @glint/scripts
npx {script-name} {...script-args}
# or
pnpm add -D @glint/scripts
pnpm {script-name} {...script-args}
# or
pnpm i -D @glint/scripts
pnpm {script-name} {...script-args}
```

Or with a global installation, using either your package manager or [Volta](https://volta.sh):

```sh
volta install @glint/scripts
{script-name} {...script-args}
```

## Scripts

### `migrate-glintrc`

The `migrate-glintrc` script automates migrating from `.glintrc.yml` files to using a `glint` key within `tsconfig.json` files.

Usage:

```sh
npx -p @glint/scripts migrate-glintrc <path(s) to glintrc.yml files to migrate>
```

### `auto-glint-nocheck`

The `auto-glint-nocheck` script automatically adds a `{{! @glint-nocheck }}` comment at the top of any templates in the given files that currently have type errors.

It accepts one or more globs specifying what files it should inspect for type errors.

This script can be used when first adopting Glint in an existing project in order to immediately begin enforcing type safety for new templates while incrementally converting existing ones over time. Templates with a `@glint-nocheck` directive will still benefit from best-effort editor support for features such as hover information, go-to-definition, etc, though the quality of these features will improve the closer the template and its backing module are to being completely typesafe.

Sample usage:

```sh
npx -p @glint/scripts auto-glint-nocheck '{app,tests}/**/*.{ts,hbs,gts}'
```

The `nocheck` directive prepended to multiline templates will include a brief explanatory comment. By default, this looks like `{{! @glint-nocheck: not typesafe yet }}`, but the message can be customized with the `--explanation` flag.

**Note**: this script requires that `@glint/core` >= v0.9.6 be available locally in the project where you are running it.
