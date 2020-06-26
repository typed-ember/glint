# `@glint/config`

This package is used by various other [glint] packages to locate any custom configuration.

[glint]: https://github.com/typed-ember/glint

## Config Specification

`@glint/config` uses [`cosmiconfig`] to locate your configuration file, so several possible file formats/names are possible:

- JSON in a `"glint"` key in your `package.json`
- YAML or JSON in `.glintrc`, `.glintrc.yml` or `.glintrc.json`
- JavaScript in `.glintrc.js` or `glint.config.js`

[`cosmiconfig`]: https://github.com/davidtheclark/cosmiconfig

Configuration will be searched upward starting from the directory in whicn your `tsconfig.json` is located.

## Config Options

- `include`: A glob or array of globs specifying, relative to the location of your config file, what files should be considered for template processing by glint. Default: `'**/*.ts'`.
- `exclude`: A glob or array of globs specifying, relative to the location of your config file, what files should _not_ considered for template processing by glint. Default: `'**/node_modules/**'`.

Note that if a file is matched by both `include` and `exclude`, it will be ignored.
