// Reference the scaffolding for the template registry and our merged declarations
// for third party modules so that vanilla TS will see those as long as authors
// have `import '@glint/environment-ember-loose'` somewhere in their project.

/// <reference path="../registry/index.d.ts" />
/// <reference path="./dsl/integration-declarations.d.ts" />
