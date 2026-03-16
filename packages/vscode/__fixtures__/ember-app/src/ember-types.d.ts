// Minimal stubs so the fixture can reference @ember/component/template-only
// In real Ember apps, these come from ember-source + @glint/ember-tsc integration types.
declare module '@ember/component/template-only' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface TemplateOnlyComponent<S> {}
  export type TOC<S> = TemplateOnlyComponent<S>;
}
