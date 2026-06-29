import '@glint/ember-tsc/types';

// On ember-source < 7.1, `and`/`or`/`not`/`eq`/`neq` are NOT built-in template
// keywords, so they are not members of Glint's `Globals` type. When they are
// configured as operator special forms (see tsconfig.json
// `additionalSpecialForms`), the transform still emits a *discarded* reference
// to the keyword — `__glintDSL__.noop(Globals.<name>)` — purely to preserve
// hover and go-to-definition on it. Declaring the names here satisfies that
// reference. The narrowing under test comes entirely from the emitted
// `&&`/`||`/`===`/`!==`/`!` operators and is independent of these types.
declare module '@glint/ember-tsc/globals' {
  export default interface Globals {
    and: unknown;
    or: unknown;
    not: unknown;
    eq: unknown;
    neq: unknown;
  }
}
