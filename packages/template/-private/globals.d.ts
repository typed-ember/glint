// According to the strict mode RFC, these identifiers are 'keywords' that are
// always implicitly in scope. While that's true for Ember applications, it doesn't
// necessarily apply to Glimmer.js or GlimmerX, so this likely needs to be factored
// into those environment-specific type declarations in the future.
// https://github.com/emberjs/rfcs/pull/496/files#diff-813a6bebec3bf341e6af852f27444bc0R437
interface Keywords {
  action: void; // TODO
  component: import('./keywords/component').default;
  debugger: import('./keywords/debugger').default;
  'each-in': import('./keywords/each-in').default;
  each: import('./keywords/each').default;
  'has-block-params': import('./keywords/has-block-params').default;
  'has-block': import('./keywords/has-block').default;
  hasBlock: import('./keywords/has-block').default;
  // `if` is implemented directly in @glint/transform
  'in-element': void; // TODO
  let: import('./keywords/let').default;
  'link-to': void; // TODO
  loc: void; // TODO
  log: void; // TODO
  mount: void; // TODO
  mut: void; // TODO
  outlet: void; // TODO
  'query-params': void; // TODO
  readonly: void; // TODO
  unbound: void; // TODO
  unless: void; // TODO (maybe implement directly in @glint/transform?)
  with: import('./keywords/with').default;
  // `yield` is implemented directly in @glint/transform
}

// This `Globals` interface dictates what identifiers will always be in scope
// even when not statically visible. In principle it can be extended outside
// this package, and could even be used to implement support for today's
// resolver-based template entity lookup via a type registry-style system.
interface Globals extends Keywords {
  // The strict-mode RFC proposes that these be importable since they're
  // theoretically implementable in userland, but for simplicity for now we're
  // just including them in `Globals`.
  fn: import('./built-ins/fn').default;
  on: import('./built-ins/on').default;
}

declare const Globals: Globals;

export default Globals;
