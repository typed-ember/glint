// Reference the scaffolding for our merged declarations for third party modules so
// that vanilla TS will see those as long as authors have
// `import '@glint/environment-ember-template-imports'` somewhere in their project.

/// <reference path="../globals/index.d.ts" preserve="true" />
/// <reference path="./dsl/integration-declarations.d.ts" preserve="true" />
export {};
