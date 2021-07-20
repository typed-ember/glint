export let Ember: any;

// In Ember >= 3.27, accessing the `Ember` global triggers a deprecation
// warning, while in Ember < 3.27, `require('ember')` is unavailable, so
// we need to try the latter and fall back to the former.
try {
  Ember = window.require('ember').default;
} catch {
  Ember = (window as any).Ember;
}
