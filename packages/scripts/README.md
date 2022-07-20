# Glint scripts

A handful of tools for working with Glint—e.g. for migrations.

## `migrate-glintrc`

To migrate from `.glintrc.yml` files to using a `glint` key within `tsconfig.json` files, you can either run the script via `npx`, or install the tool somewhere and run it directly.

With npx:

```sh
npx -p @glint/scripts migrate-glintrc <path(s) to glintrc.yml files to migrate>
```

With a local npm installation:

```sh
npm install --save-dev @glint/scripts
node ./node_modules/.bin/migrate-glintrc <paths to glintrc.yml files to migrate>
```

With a local Yarn installation:

```sh
yarn add --dev @glint/scripts
yarn migrate-glintrc <paths to glintrc.yml files to migrate>
```

With a [Volta](https://volta.sh) user-level installation:

```sh
volta install @glint/scripts
migrate-glintrc <paths to glintrc.yml files to migrate>
```
