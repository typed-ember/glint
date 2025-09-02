# Changelog

## Release (2025-09-02)

* @glint/core 2.0.0-alpha.5 (major)
* @glint/tsserver-plugin 2.0.0-alpha.5 (major)
* @glint/type-test 2.0.0-alpha.4 (major)

#### :boom: Breaking Change
* `@glint/core`, `@glint/tsserver-plugin`, `@glint/type-test`
  * [#939](https://github.com/typed-ember/glint/pull/939) Absorb `@glint/environment-ember-template-imports` into `@glint/core` ([@machty](https://github.com/machty))
* `@glint/core`, `@glint/type-test`
  * [#933](https://github.com/typed-ember/glint/pull/933) Remove ember-loose environment + handlebars support ([@machty](https://github.com/machty))

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
