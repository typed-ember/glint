# Glint scripts

A handful of tools for working with Glint—e.g. for migrations.

## `migrate-glintrc`

To migrate from `.glintrc.yml` files to using a `glint` key within `tsconfig.json` files:

- install `@glint/scripts` as a dev dependency
- run the `migrate-glintrc` script:
    - `node ./node_modules/.bin/migrate-glintrc <paths to glintrc.yml files to migrate>`
    - `yarn migrate-glintrc <paths to glintrc.yml files to migrate>`
