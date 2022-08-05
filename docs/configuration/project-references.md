Glint works out of the box with TypeScript’s [Project References][pr] feature:

- Instead of running just `glint`, you run `glint --build`, and Glint will correctly do incremental builds for composite projects.
- In the future, the Glint Language Server also takes advantage of composite projects to improve performance when working in just one part of a large codebase.

{% hint style="info" %}

This is not a guide to project references and composite projects. Instead, see [the TypeScript docs][pr].

{% endhint %}

As with project references in general, there are a few extra pieces of configuration to add, though.

[pr]: http://www.typescriptlang.org/docs/handbook/project-references.html#composite

## Shared project-wide configuration

First, as with project references in general, you should define your `glint` config in a shared compiler options `tsconfig.json` at the root. For example, you might have something like this as a `tsconfig.shared.json`:

```jsonc
{
  "compilerOptions": {
    // ...
  },
  "glint": {
    "environment": "ember-template-imports"
  }
}
```

Then each project within can use the `extends` key to reuse both TypeScript and Glint configuration. For example, if your project has sub-projects all located in `packages/<project>`, a sub-project might have a `tsconfig.json` file like this:

```jsonc
{
  "extends": "../../tsconfig.shared.json",
  "compilerOptions": {
    "composite": true
  }
}
```

## Per-project configuration

To work with Glint, each sub-project needs to include the Glint environment imports it uses. (See [Ember: Installation][ei] and [GlimmerX: Imports][gi] for details.) For example, a project using `ember-template-imports` should have this import visible somewhere:

```ts
import '@glint/environment-ember-template-imports';
```

[ei]: ../ember/installation.md
[gi]: ../glimmerx/imports.md

The easiest way to do this is to add it to a shared file all projects can reference using the `include` key in each sub-project's `tsconfig.json`.
If you do not already have something filling this role, you should introduce a `local-types` directory (named however you like) in the root of your project, with an `index.d.ts` in it.

{% hint style="info" %}

If you are using `ember-cli-typescript`, you can do this in the `types/index.d.ts` file created automatically for you by the addon. Just make sure you add that directory to the `include` field in all your sub-project `tsconfig.json` files.

{% endhint %}

The resulting project structure might look something like this, given sub-projects in `packages` which have their TypeScript source files in a `src` directory:

```
.
├── package.json
├── packages
│   ├── a
│   │   ├── local-types
│   │   │   └── index.d.ts
│   │   ├── package.json
│   │   ├── src
│   │   └── tsconfig.json
│   └── b
│       ├── package.json
│       ├── src
│       └── tsconfig.json
├── tsconfig.json
├── tsconfig.shared.json
└── local-types
    └── index.d.ts
```

With this structure, the sub-project configurations, like `packages/a/tsconfig.json`, can be very minimal. The only things they need to do are:

- extend the root options config
- include the `types` directory as well as their own files

```json
{
  "extends": "../../tsconfig.shared.json",
  "compilerOptions": {
    "composite": true
  },
  "include": ["../../local-types", "./src"]
}
```

## Customizing sub-project configuration

If needed, you can customize each sub-project by overriding its `glint` settings, just as you can with `compilerOptions`. For example, if you have one sub-project which is using the `ember-loose` environment instead of `ember-template-imports`, you would need to make two changes for that package:

- include the corresponding import in a file in the project (or in another shared location)
- update the `glint` config in that project's `tsconfig.json`

If this were in sub-project `a` from the example above, the resulting layout might look like this:

```
├── packages
│   ├── a
│   │   ├── local-types
│   │   │   └── index.d.ts
│   │   ├── package.json
│   │   ├── src
│   │   └── tsconfig.json
```

The updated `packages/a/tsconfig.json` file might look like this:

```json
{
  "extends": "../../tsconfig.shared.json",
  "compilerOptions": {
    "composite": true
  },
  "include": ["./local-types", "./src"],
  "glint": {
    "environment": "ember-loose"
  }
}
```

Note that here it uses `local-types` from `a`, _not_ from the root. You can also have both present:

```json
{
  "include": ["../../local-types/**/*.ts", "./local-types/**/*.ts", "./src/**/*.ts"]
}
```

The key is to make sure each project has all required imports available, and _not_ to have imports present which a given sub-project does not require.
