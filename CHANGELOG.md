# Changelog

## Release (2026-01-28)

* @glint/ember-tsc 1.1.0 (minor)
* @glint/template 1.7.4 (patch)
* @glint/tsserver-plugin 2.1.0 (minor)

#### :rocket: Enhancement
* Other
  * [#1042](https://github.com/typed-ember/glint/pull/1042) Upgrade VSCode dependencies ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* `@glint/ember-tsc`, `@glint/tsserver-plugin`
  * [#1039](https://github.com/typed-ember/glint/pull/1039) Update direct dependencies and removed unused dependencies  ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#1037](https://github.com/typed-ember/glint/pull/1037) Upgrade all volar-related dependencies ([@NullVoxPopuli](https://github.com/NullVoxPopuli))

#### :house: Internal
* Other
  * [#1043](https://github.com/typed-ember/glint/pull/1043) Make v2-ts-ember-addon private ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* `@glint/template`
  * [#1041](https://github.com/typed-ember/glint/pull/1041) Update HTML Attributes ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#1036](https://github.com/typed-ember/glint/pull/1036) Untyped components should allow any attributes ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* `@glint/ember-tsc`, `@glint/tsserver-plugin`
  * [#1040](https://github.com/typed-ember/glint/pull/1040) Update linting dependencies ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* `@glint/ember-tsc`, `@glint/template`, `@glint/tsserver-plugin`
  * [#1038](https://github.com/typed-ember/glint/pull/1038) Upgrade TypeScript ([@NullVoxPopuli](https://github.com/NullVoxPopuli))

#### Committers: 1
- [@NullVoxPopuli](https://github.com/NullVoxPopuli)

## Release (2026-01-09)

* @glint/ember-tsc 1.0.9 (patch)
* @glint/tsserver-plugin 2.0.9 (patch)

#### :bug: Bug Fix
* `@glint/ember-tsc`
  * [#1031](https://github.com/typed-ember/glint/pull/1031) Fix parsing of `obj.$prop` by not over-escaping the `$` character ([@NullVoxPopuli](https://github.com/NullVoxPopuli))

#### :house: Internal
* [#1032](https://github.com/typed-ember/glint/pull/1032) Update test assertions to account for AI features in vscode ([@NullVoxPopuli](https://github.com/NullVoxPopuli))

#### Committers: 1
- [@NullVoxPopuli](https://github.com/NullVoxPopuli)

## Release (2025-11-17)

* @glint/ember-tsc 1.0.8 (patch)
* @glint/template 1.7.3 (patch)
* @glint/tsserver-plugin 2.0.8 (patch)

#### :bug: Bug Fix
* `@glint/template`
  * [#1023](https://github.com/typed-ember/glint/pull/1023) Optimized computations ([@ijlee2](https://github.com/ijlee2))

#### :memo: Documentation
* [#1019](https://github.com/typed-ember/glint/pull/1019) CONTRIBUTING: additional note about ember-tsc ([@machty](https://github.com/machty))
* [#1017](https://github.com/typed-ember/glint/pull/1017) CONTRIBUTING: add note about Volar Labs transformed files ([@machty](https://github.com/machty))

#### Committers: 2
- Alex Matchneer ([@machty](https://github.com/machty))
- Isaac Lee ([@ijlee2](https://github.com/ijlee2))

## Release (2025-10-31)

* @glint/ember-tsc 1.0.7 (patch)
* @glint/template 1.7.2 (patch)
* @glint/tsserver-plugin 2.0.7 (patch)

#### :bug: Bug Fix
* `@glint/template`
  * [#1013](https://github.com/typed-ember/glint/pull/1013) Changed GlobalSVGAttributes to extend GlobalHTMLAttributes instead of just GlobalAriaAttributes ([@johanrd](https://github.com/johanrd))

#### Committers: 1
- [@johanrd](https://github.com/johanrd)

## Release (2025-10-31)

* @glint/ember-tsc 1.0.6 (patch)
* @glint/template 1.7.1 (patch)
* @glint/tsserver-plugin 2.0.6 (patch)

#### :bug: Bug Fix
* `@glint/template`
  * [#1011](https://github.com/typed-ember/glint/pull/1011) fix regression where ariaAttributes were lost from SVGSVGElementAttributes ([@johanrd](https://github.com/johanrd))

#### :house: Internal
* [#1007](https://github.com/typed-ember/glint/pull/1007) Test Attributes extension the way a consumer would ([@NullVoxPopuli](https://github.com/NullVoxPopuli))

#### Committers: 2
- [@NullVoxPopuli](https://github.com/NullVoxPopuli)
- [@johanrd](https://github.com/johanrd)

## Release (2025-10-30)

* @glint/ember-tsc 1.0.5 (patch)
* @glint/template 1.7.0 (minor)
* @glint/tsserver-plugin 2.0.5 (patch)

#### :rocket: Enhancement
* `@glint/template`
  * [#1005](https://github.com/typed-ember/glint/pull/1005) Make element attributes extensible, fix unneeded element-type branding ([@NullVoxPopuli](https://github.com/NullVoxPopuli))

#### :bug: Bug Fix
* `@glint/template`
  * [#1005](https://github.com/typed-ember/glint/pull/1005) Make element attributes extensible, fix unneeded element-type branding ([@NullVoxPopuli](https://github.com/NullVoxPopuli))

#### :memo: Documentation
* [#1006](https://github.com/typed-ember/glint/pull/1006) Fix typos and formatting in v2-upgrade.md ([@evoactivity](https://github.com/evoactivity))
* [#1003](https://github.com/typed-ember/glint/pull/1003) fix README.md glint v2 docs link ([@vlascik](https://github.com/vlascik))

#### Committers: 3
- Liam Potter ([@evoactivity](https://github.com/evoactivity))
- [@NullVoxPopuli](https://github.com/NullVoxPopuli)
- [@vlascik](https://github.com/vlascik)

## Release (2025-10-17)

* @glint/ember-tsc 1.0.4 (patch)
* @glint/template 1.6.2 (patch)
* @glint/tsserver-plugin 2.0.4 (patch)
* v2-ts-ember-addon 0.0.1 (patch)

#### :bug: Bug Fix
* `@glint/template`
  * [#1000](https://github.com/typed-ember/glint/pull/1000) Support HTML properties for HTML elements ([@mogstad](https://github.com/mogstad))

#### :memo: Documentation
* [#997](https://github.com/typed-ember/glint/pull/997) Fix some typos in upgrade guide ([@evoactivity](https://github.com/evoactivity))
* [#996](https://github.com/typed-ember/glint/pull/996) Delete GLINT_V2.md ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* [#994](https://github.com/typed-ember/glint/pull/994) Update README to reflect Glint 2 status ([@NullVoxPopuli](https://github.com/NullVoxPopuli))

#### :house: Internal
* `v2-ts-ember-addon`
  * [#998](https://github.com/typed-ember/glint/pull/998) Add another test project for assuring we build declarations correctly ([@NullVoxPopuli](https://github.com/NullVoxPopuli))

#### Committers: 3
- Bjarne Mogstad ([@mogstad](https://github.com/mogstad))
- Liam Potter ([@evoactivity](https://github.com/evoactivity))
- [@NullVoxPopuli](https://github.com/NullVoxPopuli)

## Release (2025-10-02)

* @glint/ember-tsc 1.0.3 (patch)
* @glint/tsserver-plugin 2.0.3 (patch)

#### :bug: Bug Fix
* `@glint/ember-tsc`
  * [#991](https://github.com/typed-ember/glint/pull/991) Add `type` annotations to fix embroider-vite builds ([@machty](https://github.com/machty))

#### Committers: 1
- Alex Matchneer ([@machty](https://github.com/machty))

## Release (2025-10-01)

* @glint/ember-tsc 1.0.2 (patch)
* @glint/tsserver-plugin 2.0.2 (patch)

#### :bug: Bug Fix
* `@glint/ember-tsc`
  * [#989](https://github.com/typed-ember/glint/pull/989) Allow V2 addons to get .d.ts declarations instead of .gts.d.ts ([@BoussonKarel](https://github.com/BoussonKarel))

#### Committers: 1
- [@BoussonKarel](https://github.com/BoussonKarel)

## Release (2025-10-01)

* @glint/ember-tsc 1.0.1 (patch)
* @glint/template 1.6.1 (patch)
* @glint/tsserver-plugin 2.0.1 (patch)

#### :bug: Bug Fix
* `@glint/template`
  * [#986](https://github.com/typed-ember/glint/pull/986) Add missing "xmlns" attribut to SVGSVGElementAttributes ([@bartocc](https://github.com/bartocc))

#### :memo: Documentation
* Other
  * [#987](https://github.com/typed-ember/glint/pull/987) Listed ember-codemod-add-template-tags as a migration option ([@ijlee2](https://github.com/ijlee2))
  * [#982](https://github.com/typed-ember/glint/pull/982) Publish v2 docs ([@machty](https://github.com/machty))
* `@glint/ember-tsc`
  * [#985](https://github.com/typed-ember/glint/pull/985) Typo in README.md ([@bartocc](https://github.com/bartocc))

#### Committers: 3
- Alex Matchneer ([@machty](https://github.com/machty))
- Isaac Lee ([@ijlee2](https://github.com/ijlee2))
- Julien Palmas ([@bartocc](https://github.com/bartocc))

## Release (2025-09-30)

* @glint/ember-tsc 1.0.0 (minor)
* @glint/template 1.6.0 (minor)
* @glint/tsserver-plugin 2.0.0 (minor)
* @glint/type-test 2.0.0 (minor)

#### :rocket: Enhancement
* `@glint/ember-tsc`, `@glint/template`, `@glint/tsserver-plugin`, `@glint/type-test`
  * [#979](https://github.com/typed-ember/glint/pull/979) Split out ember-tsc and Glint 2 extension for hybrid upgrade strategy ([@machty](https://github.com/machty))

#### :house: Internal
* `@glint/ember-tsc`, `@glint/template`, `@glint/tsserver-plugin`, `@glint/type-test`
  * [#981](https://github.com/typed-ember/glint/pull/981) release-plan: prep for v2 ([@machty](https://github.com/machty))

#### Committers: 1
- Alex Matchneer ([@machty](https://github.com/machty))

## Release (2025-09-30)

* @glint/core 2.0.0-alpha.12 (patch)
* @glint/template 1.6.0-alpha.4 (patch)
* @glint/tsserver-plugin 2.0.0-alpha.12 (patch)
* @glint/type-test 2.0.0-alpha.5 (patch)

#### :bug: Bug Fix
* `@glint/core`
  * [#828](https://github.com/typed-ember/glint/pull/828) volar-service-typescript dep - replace NPM tag with version number ([@bartocc](https://github.com/bartocc))

#### :house: Internal
* `@glint/core`, `@glint/template`, `@glint/tsserver-plugin`, `@glint/type-test`
  * [#977](https://github.com/typed-ember/glint/pull/977) Revert "Remove release-plan alpha configuration for v2 prep (#975)" ([@machty](https://github.com/machty))
  * [#975](https://github.com/typed-ember/glint/pull/975) Remove release-plan alpha configuration for v2 prep ([@machty](https://github.com/machty))

#### Committers: 2
- Alex Matchneer ([@machty](https://github.com/machty))
- Julien Palmas ([@bartocc](https://github.com/bartocc))

## Release (2025-09-29)

* @glint/core 2.0.0-alpha.11 (patch)
* @glint/tsserver-plugin 2.0.0-alpha.11 (patch)

#### :bug: Bug Fix
* `@glint/core`
  * [#971](https://github.com/typed-ember/glint/pull/971) Surface v1/v2 dep mismatch errors ([@machty](https://github.com/machty))

#### Committers: 1
- Alex Matchneer ([@machty](https://github.com/machty))

## Release (2025-09-27)

* @glint/core 2.0.0-alpha.10 (patch)
* @glint/tsserver-plugin 2.0.0-alpha.10 (patch)

#### :bug: Bug Fix
* `@glint/core`
  * [#969](https://github.com/typed-ember/glint/pull/969) Bugfix and test for additionalSpecialForms ([@machty](https://github.com/machty))

#### Committers: 1
- Alex Matchneer ([@machty](https://github.com/machty))

## Release (2025-09-26)

* @glint/core 2.0.0-alpha.9 (patch)
* @glint/tsserver-plugin 2.0.0-alpha.9 (patch)

#### :bug: Bug Fix
* `@glint/core`
  * [#968](https://github.com/typed-ember/glint/pull/968) Fix mapping issue with block params ([@machty](https://github.com/machty))
  * [#966](https://github.com/typed-ember/glint/pull/966) Reinstate additionalSpecialForms ([@machty](https://github.com/machty))

#### Committers: 1
- Alex Matchneer ([@machty](https://github.com/machty))

## Release (2025-09-26)

* @glint/core 2.0.0-alpha.8 (patch)
* @glint/template 1.6.0-alpha.3 (patch)
* @glint/tsserver-plugin 2.0.0-alpha.8 (patch)

#### :bug: Bug Fix
* `@glint/core`
  * [#964](https://github.com/typed-ember/glint/pull/964) Export `@glint/core/types` for integration declarations ([@machty](https://github.com/machty))
  * [#965](https://github.com/typed-ember/glint/pull/965) Fix occasional source mapping errors ([@machty](https://github.com/machty))
  * [#955](https://github.com/typed-ember/glint/pull/955) Surface diagnostics due to attempting to assign attributes to default Element ([@machty](https://github.com/machty))
* `@glint/template`
  * [#962](https://github.com/typed-ember/glint/pull/962) Add value to HTMLTextAreaElementAttributes ([@bendemboski](https://github.com/bendemboski))

#### Committers: 2
- Alex Matchneer ([@machty](https://github.com/machty))
- Ben Demboski ([@bendemboski](https://github.com/bendemboski))

## Release (2025-09-15)

* @glint/core 2.0.0-alpha.7 (minor)
* @glint/tsserver-plugin 2.0.0-alpha.7 (minor)

#### :rocket: Enhancement
* `@glint/core`, `@glint/tsserver-plugin`
  * [#953](https://github.com/typed-ember/glint/pull/953) Bump volar deps and cleanup ([@machty](https://github.com/machty))

#### :bug: Bug Fix
* `@glint/core`, `@glint/tsserver-plugin`
  * [#959](https://github.com/typed-ember/glint/pull/959) Fix auto-imports for first import ([@machty](https://github.com/machty))

#### Committers: 1
- Alex Matchneer ([@machty](https://github.com/machty))

## Release (2025-09-09)

* @glint/core 2.0.0-alpha.6 (patch)
* @glint/tsserver-plugin 2.0.0-alpha.6 (patch)

#### :bug: Bug Fix
* `@glint/core`
  * [#950](https://github.com/typed-ember/glint/pull/950) Reinstate types for LinkTo, TextArea, and Input ([@machty](https://github.com/machty))

#### :memo: Documentation
* [#948](https://github.com/typed-ember/glint/pull/948) Add notes to recent CHANGELOG ([@machty](https://github.com/machty))

#### Committers: 1
- Alex Matchneer ([@machty](https://github.com/machty))

## Release (2025-09-02)

* @glint/core 2.0.0-alpha.5 (major)
* @glint/tsserver-plugin 2.0.0-alpha.5 (major)
* @glint/type-test 2.0.0-alpha.4 (major)
* VSCode extension 1.4.17 (pre-release)

#### :boom: Breaking Change
* `@glint/core`, `@glint/tsserver-plugin`, `@glint/type-test`
  * [#939](https://github.com/typed-ember/glint/pull/939) Absorb `@glint/environment-ember-template-imports` into `@glint/core` ([@machty](https://github.com/machty))
* `@glint/core`, `@glint/type-test`
  * [#933](https://github.com/typed-ember/glint/pull/933) Remove ember-loose environment + handlebars support ([@machty](https://github.com/machty))

##### Simplified Dependencies

As of this release, you only need two dependencies in your Ember apps (the versions provided are up-to-date at the time of writing but please check the latest versions on NPM):

```
    "@glint/core": "2.0.0-alpha.5",
    "@glint/template": "1.6.0-alpha.2",
```

(You will want to use the pre-release VSCode extension v1.4.17 in conjunction with these dependencies!)

Notably absent are the `@glint/environment-ember-template-imports` and `@glint/environment-ember-loose` packages:

There is no longer any concept of "environments" in Glint v2, which going forward will only support features previously covered/provided by the `@glint/environment-ember-template-imports` environment, which provides typechecking for `.gts`/`.gjs` files (aka the [Template Tag Format](https://guides.emberjs.com/release/components/template-tag-format/)). Furthermore, the functionality previously provided by `glint/environment-ember-loose` (namely support for type-checking classic Ember components consisting of a .ts/.js file with .hbs template) has been entirely removed. If type-checking support for .hbs files is still a requirement, you may want to consider continuing to use an older version of Glint.

##### Simplified Configuration

It is now _no longer a requirement_ to specify a `"glint": { ... }` configuration in your `tsconfig.json` files; going forward, you need only specify the `@glint/core` and `@glint/template` dependencies (see above) in your package.json file.

The only reason to continue specifying a `"glint"` configuration object in `tsconfig.json` is if you need to specify options that applied to the (now-absorbed / obsolete) `@glint/environment-ember-template-imports` environment, e.g. `"additionalGlobals"`, in which case you would move that configuration to the top-level "namespace", e.g.

```
{
  "compilerOptions": { ... },
  "glint": {
    "additionalGlobals": ["t"]
  }
}
```

For the time being, Glint V2 will continue to support the old style of configuration to ease the transition to Glint V2, but app maintainers are encouraged to upgrade to the above style (or in many cases just completely remove the `"glint"` config entirely) as soon as possible.

#### :house: Internal
* [#944](https://github.com/typed-ember/glint/pull/944) rm a few wontfix skipped tests ([@machty](https://github.com/machty))
* [#938](https://github.com/typed-ember/glint/pull/938) rm leftover sentinel from previous merge ([@machty](https://github.com/machty))

#### Committers: 1
- Alex Matchneer ([@machty](https://github.com/machty))

## Release (2025-08-13)

* @glint/core 2.0.0-alpha.4 (minor)
* @glint/tsserver-plugin 2.0.0-alpha.4 (minor)

#### :rocket: Enhancement
* `@glint/core`
  * [#932](https://github.com/typed-ember/glint/pull/932) More precise diagnostics for parse/compiler errors ([@machty](https://github.com/machty))
* `@glint/core`, `@glint/tsserver-plugin`
  * [#931](https://github.com/typed-ember/glint/pull/931) Raise diagnostic errors due to syntax errors in .gts/.gjs template tags ([@machty](https://github.com/machty))

#### :bug: Bug Fix
* `@glint/core`
  * [#928](https://github.com/typed-ember/glint/pull/928) Fix diagnostics for modifiers and other cases ([@machty](https://github.com/machty))
  * [#927](https://github.com/typed-ember/glint/pull/927) Fix broken directives that reference suppressed attr name ([@machty](https://github.com/machty))

#### :house: Internal
* [#925](https://github.com/typed-ember/glint/pull/925) Reinstate a fixed test, rm unsupported .hbs test ([@machty](https://github.com/machty))
* [#923](https://github.com/typed-ember/glint/pull/923) rm old Pods components ([@machty](https://github.com/machty))

#### Committers: 1
- Alex Matchneer ([@machty](https://github.com/machty))

## Release (2025-07-15)

* @glint/core 2.0.0-alpha.3 (patch)
* @glint/environment-ember-loose 2.0.0-alpha.3 (patch)
* @glint/environment-ember-template-imports 2.0.0-alpha.3 (patch)
* @glint/template 1.6.0-alpha.2 (patch)
* @glint/tsserver-plugin 2.0.0-alpha.3 (patch)
* @glint/type-test 2.0.0-alpha.3 (patch)

#### :bug: Bug Fix
* `@glint/core`
  * [#910](https://github.com/typed-ember/glint/pull/910) Fix glimmer/syntax deprecation ([@ef4](https://github.com/ef4))
* `@glint/core`, `@glint/tsserver-plugin`
  * [#912](https://github.com/typed-ember/glint/pull/912) Reinstate directives in a way that works with tsc (glint binary) ([@machty](https://github.com/machty))

#### :house: Internal
* `@glint/core`, `@glint/environment-ember-loose`, `@glint/environment-ember-template-imports`, `@glint/template`, `@glint/type-test`
  * [#914](https://github.com/typed-ember/glint/pull/914) Re-enable types tests ([@machty](https://github.com/machty))

#### Committers: 2
- Alex Matchneer ([@machty](https://github.com/machty))
- Edward Faulkner ([@ef4](https://github.com/ef4))

## Release (2025-06-17)

* @glint/core 2.0.0-alpha.2 (patch)
* @glint/environment-ember-loose 2.0.0-alpha.2 (patch)
* @glint/environment-ember-template-imports 2.0.0-alpha.2 (patch)
* @glint/template 1.6.0-alpha.1 (patch)
* @glint/tsserver-plugin 2.0.0-alpha.2 (patch)
* @glint/type-test 2.0.0-alpha.2 (patch)

#### :bug: Bug Fix
* `@glint/core`, `@glint/environment-ember-loose`, `@glint/environment-ember-template-imports`, `@glint/template`, `@glint/tsserver-plugin`, `@glint/type-test`
  * [#908](https://github.com/typed-ember/glint/pull/908) Fix build to prepare for re-releasing alphas ([@NullVoxPopuli](https://github.com/NullVoxPopuli))

#### Committers: 1
- [@NullVoxPopuli](https://github.com/NullVoxPopuli)

## Release (2025-06-16)

* @glint/core 2.0.0-alpha.1 (major)
* @glint/environment-ember-loose 2.0.0-alpha.1 (major)
* @glint/environment-ember-template-imports 2.0.0-alpha.1 (major)
* @glint/template 1.6.0-alpha.0 (major)
* @glint/tsserver-plugin 2.0.0-alpha.1 (major)
* @glint/type-test 2.0.0-alpha.1 (patch)

#### :boom: Breaking Change
* `@glint/core`, `@glint/environment-ember-loose`, `@glint/environment-ember-template-imports`, `@glint/template`
  * [#820](https://github.com/typed-ember/glint/pull/820) Drop support for @types/ember* only use native/built-in types ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* `@glint/core`, `@glint/tsserver-plugin`
  * [#811](https://github.com/typed-ember/glint/pull/811) Migrate tests to TS Plugin mode, remove option for old LS mode ([@machty](https://github.com/machty))
* Other
  * [#790](https://github.com/typed-ember/glint/pull/790) Re-write extension to use reactive-vscode, align with Vue extension ([@machty](https://github.com/machty))
* `@glint/core`
  * [#750](https://github.com/typed-ember/glint/pull/750) Rm TransformManager and lots of pre-volar code ([@machty](https://github.com/machty))
  * [#740](https://github.com/typed-ember/glint/pull/740) Fix `glint` cli build tests, parity with `vue-tsc` ([@machty](https://github.com/machty))
  * [#739](https://github.com/typed-ember/glint/pull/739) rm glint/getIR command ([@machty](https://github.com/machty))
* `@glint/environment-ember-loose`
  * [#721](https://github.com/typed-ember/glint/pull/721) feat: drop support for classic component layout ([@aklkv](https://github.com/aklkv))
* `@glint/core`, `@glint/environment-ember-loose`, `@glint/environment-ember-template-imports`
  * [#726](https://github.com/typed-ember/glint/pull/726) Re-write using Volar: initially only supporting .gts ([@machty](https://github.com/machty))
* `@glint/core`, `@glint/template`
  * [#716](https://github.com/typed-ember/glint/pull/716) Remove GlimmerX ([@machty](https://github.com/machty))

#### :rocket: Enhancement
* Other
  * [#895](https://github.com/typed-ember/glint/pull/895) VSCode: Add activationEvents for glimmer-ts/js file types ([@machty](https://github.com/machty))
  * [#803](https://github.com/typed-ember/glint/pull/803) Use jiti for sync loading from TS Plugin ([@machty](https://github.com/machty))
  * [#791](https://github.com/typed-ember/glint/pull/791) Monkeypatch remaining TS features within .gts files ([@machty](https://github.com/machty))
* `@glint/core`, `@glint/tsserver-plugin`
  * [#890](https://github.com/typed-ember/glint/pull/890) Move .gts/.gjs import hacks to TS Plugin ([@machty](https://github.com/machty))
  * [#877](https://github.com/typed-ember/glint/pull/877) Reinstate GJS Support ([@machty](https://github.com/machty))
  * [#873](https://github.com/typed-ember/glint/pull/873) Disregard semantic classification tokens from `<template>` portions of .gts files ([@machty](https://github.com/machty))
* `@glint/core`
  * [#888](https://github.com/typed-ember/glint/pull/888) Restore previous approach to glint-* directives atop new TS Plugin architecture ([@machty](https://github.com/machty))
  * [#876](https://github.com/typed-ember/glint/pull/876) Support for Symbols, Outline, Code Folding in .gts files ([@machty](https://github.com/machty))
  * [#874](https://github.com/typed-ember/glint/pull/874) Fix organize imports ([@machty](https://github.com/machty))
  * [#856](https://github.com/typed-ember/glint/pull/856) Support (neo)vim filetypes for gts and gjs ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#854](https://github.com/typed-ember/glint/pull/854) Loose mode: only parse .ts in `components/` folder ([@machty](https://github.com/machty))
  * [#838](https://github.com/typed-ember/glint/pull/838) Support extending multiple config files ([@mogstad](https://github.com/mogstad))
  * [#839](https://github.com/typed-ember/glint/pull/839) use more specific nodes for open tag ([@patricklx](https://github.com/patricklx))
  * [#813](https://github.com/typed-ember/glint/pull/813) Cleanup old LS remainders, disable CLI tests for now, rm ephemeral tests ([@machty](https://github.com/machty))
  * [#749](https://github.com/typed-ember/glint/pull/749) Primitives for supporting ember-loose mode (.ts + .hbs) ([@machty](https://github.com/machty))
  * [#747](https://github.com/typed-ember/glint/pull/747) volar-2.4.0-alpha.14 ([@machty](https://github.com/machty))
  * [#713](https://github.com/typed-ember/glint/pull/713) check if template is in heritage clause ([@patricklx](https://github.com/patricklx))
* `@glint/core`, `@glint/template`, `@glint/tsserver-plugin`
  * [#849](https://github.com/typed-ember/glint/pull/849) add html attribute validation & completions  ([@patricklx](https://github.com/patricklx))
* `@glint/core`, `@glint/environment-ember-loose`, `@glint/environment-ember-template-imports`, `@glint/template`
  * [#753](https://github.com/typed-ember/glint/pull/753) TS Plugin: basic diagnostics and functionality for .gts files ([@machty](https://github.com/machty))
* `@glint/core`, `@glint/environment-ember-loose`, `@glint/environment-ember-template-imports`
  * [#726](https://github.com/typed-ember/glint/pull/726) Re-write using Volar: initially only supporting .gts ([@machty](https://github.com/machty))

#### :bug: Bug Fix
* `@glint/template`
  * [#903](https://github.com/typed-ember/glint/pull/903) @glint/template: Fix Element extends comparison ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#880](https://github.com/typed-ember/glint/pull/880) fix missing generic attrs for svg ([@patricklx](https://github.com/patricklx))
* `@glint/core`, `@glint/tsserver-plugin`
  * [#889](https://github.com/typed-ember/glint/pull/889) Reinstate "unused @glint-expect-error directive" ([@machty](https://github.com/machty))
* `@glint/core`
  * [#865](https://github.com/typed-ember/glint/pull/865) Prefer variables in scope over global variables ([@mogstad](https://github.com/mogstad))
  * [#861](https://github.com/typed-ember/glint/pull/861) Inject hidden imports to fix `.gts`/`.gjs` extensions ([@machty](https://github.com/machty))
  * [#851](https://github.com/typed-ember/glint/pull/851) Refrain creating ember-loose virtual code in non ember-loose environment ([@mogstad](https://github.com/mogstad))
  * [#809](https://github.com/typed-ember/glint/pull/809) Bump volar to 2.4.12, fix caching issue w loose mode ([@machty](https://github.com/machty))
  * [#799](https://github.com/typed-ember/glint/pull/799) Reinstate glint-expect-error (and other directives) for tsc and TS Plugin using Vue's approach ([@machty](https://github.com/machty))
  * [#795](https://github.com/typed-ember/glint/pull/795) Restore "unused glint-expect-error" diagnostic ([@machty](https://github.com/machty))
  * [#794](https://github.com/typed-ember/glint/pull/794) Reinstate expect-error directives for .gts ([@machty](https://github.com/machty))
  * [#783](https://github.com/typed-ember/glint/pull/783) Suppress exception thrown by require.resolve if the file does not exist ([@iarroyo](https://github.com/iarroyo))
  * [#782](https://github.com/typed-ember/glint/pull/782) Typed ember/resolve config from extends package ([@iarroyo](https://github.com/iarroyo))
  * [#779](https://github.com/typed-ember/glint/pull/779) Closes [#778](https://github.com/typed-ember/glint/issues/778) - add missing dependency to @glint/core ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* Other
  * [#866](https://github.com/typed-ember/glint/pull/866) enable completions in vscode ([@patricklx](https://github.com/patricklx))
  * [#858](https://github.com/typed-ember/glint/pull/858) Disable esModuleInterop to restore VSCode monkeypatching ([@machty](https://github.com/machty))
* `@glint/environment-ember-template-imports`
  * [#859](https://github.com/typed-ember/glint/pull/859) Fix handling of `satisfies` on components. ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* `@glint/core`, `@glint/environment-ember-template-imports`
  * [#842](https://github.com/typed-ember/glint/pull/842) Improve multi-byte character handling ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#825](https://github.com/typed-ember/glint/pull/825) Support implicit default export of template tags with satisfies keyword ([@mogstad](https://github.com/mogstad))
* `@glint/tsserver-plugin`
  * [#829](https://github.com/typed-ember/glint/pull/829) Fix VSCode extension pre-release ([@machty](https://github.com/machty))
* `@glint/environment-ember-loose`
  * [#826](https://github.com/typed-ember/glint/pull/826) Explicitly accept an Iterable in `each-in` ([@mogstad](https://github.com/mogstad))
  * [#777](https://github.com/typed-ember/glint/pull/777) Widen peerDependencies to allow @glimmer/component v2 ([@SergeAstapov](https://github.com/SergeAstapov))

#### :memo: Documentation
* Other
  * [#872](https://github.com/typed-ember/glint/pull/872) Remove `export default` from the Template-only components example ([@Windvis](https://github.com/Windvis))
  * [#850](https://github.com/typed-ember/glint/pull/850) Update info about not disabling the `@builtin typescript` extension forV2 ([@johanrd](https://github.com/johanrd))
  * [#847](https://github.com/typed-ember/glint/pull/847) Update GLINT_V2.md with updated information ([@johanrd](https://github.com/johanrd))
  * [#836](https://github.com/typed-ember/glint/pull/836) Update GLINT_V2.md readme ([@johanrd](https://github.com/johanrd))
  * [#832](https://github.com/typed-ember/glint/pull/832) Update Glint v2 docs ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#827](https://github.com/typed-ember/glint/pull/827) Update ARCHITECTURE and GLINT_V2 docs ([@machty](https://github.com/machty))
  * [#822](https://github.com/typed-ember/glint/pull/822) Add a few docs about vscode extension monkeypatches ([@machty](https://github.com/machty))
  * [#821](https://github.com/typed-ember/glint/pull/821) Simplify the TO template tag example ([@Windvis](https://github.com/Windvis))
  * [#786](https://github.com/typed-ember/glint/pull/786) Clarify typing for no arguments/blocks ([@elwayman02](https://github.com/elwayman02))
* `@glint/type-test`
  * [#725](https://github.com/typed-ember/glint/pull/725) docs: use gjs as codefence lang ([@IgnaceMaes](https://github.com/IgnaceMaes))

#### :house: Internal
* `@glint/template`
  * [#907](https://github.com/typed-ember/glint/pull/907) Fix @glint/template version to match with what's released ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#906](https://github.com/typed-ember/glint/pull/906) Switch to preminor for @glint/template ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#881](https://github.com/typed-ember/glint/pull/881) Consolidate scripts, add generated files to eslint/prettier ignore file ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#855](https://github.com/typed-ember/glint/pull/855) Extract type-tests from `@glint/template` that cause dependency problems to their own package ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* `@glint/core`, `@glint/environment-ember-loose`, `@glint/environment-ember-template-imports`, `@glint/tsserver-plugin`, `@glint/type-test`
  * [#902](https://github.com/typed-ember/glint/pull/902) Setup alpha releases ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#818](https://github.com/typed-ember/glint/pull/818) Migrate to pnpm ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* Other
  * [#892](https://github.com/typed-ember/glint/pull/892) Remove grammars ([@evoactivity](https://github.com/evoactivity))
  * [#893](https://github.com/typed-ember/glint/pull/893) Remove deprecated F5 launch configurations ([@machty](https://github.com/machty))
  * [#894](https://github.com/typed-ember/glint/pull/894) Fix broken main test ([@machty](https://github.com/machty))
  * [#862](https://github.com/typed-ember/glint/pull/862) Use the tars directly, rather than links ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#852](https://github.com/typed-ember/glint/pull/852) rm test.only() ([@machty](https://github.com/machty))
  * [#834](https://github.com/typed-ember/glint/pull/834) Make the test-apps private ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#831](https://github.com/typed-ember/glint/pull/831) Setup release-plan for releases ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#807](https://github.com/typed-ember/glint/pull/807) Introduce smoke test for TS Plugin + Loose Mode ([@machty](https://github.com/machty))
  * [#805](https://github.com/typed-ember/glint/pull/805) Easy F5 testability of loose+gts ember app ([@machty](https://github.com/machty))
  * [#789](https://github.com/typed-ember/glint/pull/789) Single acceptance test for ts plugin mode ([@machty](https://github.com/machty))
  * [#744](https://github.com/typed-ember/glint/pull/744) Disable red CI for now ([@machty](https://github.com/machty))
  * [#743](https://github.com/typed-ember/glint/pull/743) skip vscode tests ([@machty](https://github.com/machty))
  * [#735](https://github.com/typed-ember/glint/pull/735) Fix Windows snapshots ([@machty](https://github.com/machty))
  * [#727](https://github.com/typed-ember/glint/pull/727) Setup unstable releases ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* `@glint/environment-ember-template-imports`
  * [#883](https://github.com/typed-ember/glint/pull/883) Add character tests ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* `@glint/environment-ember-loose`, `@glint/environment-ember-template-imports`, `@glint/type-test`
  * [#857](https://github.com/typed-ember/glint/pull/857) Setup external project linking / testing ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* `@glint/core`
  * [#843](https://github.com/typed-ember/glint/pull/843) Move core tests out of core package due to tests depending on packages that depend on core ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#809](https://github.com/typed-ember/glint/pull/809) Bump volar to 2.4.12, fix caching issue w loose mode ([@machty](https://github.com/machty))
  * [#788](https://github.com/typed-ember/glint/pull/788) Reinstate acceptance tests (gts) ([@machty](https://github.com/machty))
  * [#784](https://github.com/typed-ember/glint/pull/784) Upgrade to Volar 2.4.11 ([@machty](https://github.com/machty))
  * [#759](https://github.com/typed-ember/glint/pull/759) Fix prettier issues ([@machty](https://github.com/machty))
  * [#752](https://github.com/typed-ember/glint/pull/752) TS Plugin progress, bump volar ([@machty](https://github.com/machty))
  * [#751](https://github.com/typed-ember/glint/pull/751) TS Plugin WIP - restore green tests ([@machty](https://github.com/machty))
  * [#747](https://github.com/typed-ember/glint/pull/747) volar-2.4.0-alpha.14 ([@machty](https://github.com/machty))
  * [#746](https://github.com/typed-ember/glint/pull/746) Unskip/fix almost every test that doesn't require code changes ([@machty](https://github.com/machty))
  * [#745](https://github.com/typed-ember/glint/pull/745) Pass a few more build tests ([@machty](https://github.com/machty))
  * [#742](https://github.com/typed-ember/glint/pull/742) get a few composite tests passing ([@machty](https://github.com/machty))
  * [#741](https://github.com/typed-ember/glint/pull/741) Tests: Use clearer project testing commands ([@machty](https://github.com/machty))
* `@glint/core`, `@glint/environment-ember-loose`, `@glint/environment-ember-template-imports`, `@glint/template`, `@glint/type-test`
  * [#731](https://github.com/typed-ember/glint/pull/731) Split typechecking from tests ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* `@glint/core`, `@glint/environment-ember-loose`
  * [#729](https://github.com/typed-ember/glint/pull/729) Most of the way to green tests ([@machty](https://github.com/machty))

#### Committers: 12
- Alex Matchneer ([@machty](https://github.com/machty))
- Alexey Kulakov ([@aklkv](https://github.com/aklkv))
- Bjarne Mogstad ([@mogstad](https://github.com/mogstad))
- Ignace Maes ([@IgnaceMaes](https://github.com/IgnaceMaes))
- Ivan Arroyo Escobar ([@iarroyo](https://github.com/iarroyo))
- Jordan Hawker ([@elwayman02](https://github.com/elwayman02))
- Liam Potter ([@evoactivity](https://github.com/evoactivity))
- Patrick Pircher ([@patricklx](https://github.com/patricklx))
- Sam Van Campenhout ([@Windvis](https://github.com/Windvis))
- Sergey Astapov ([@SergeAstapov](https://github.com/SergeAstapov))
- [@NullVoxPopuli](https://github.com/NullVoxPopuli)
- [@johanrd](https://github.com/johanrd)
