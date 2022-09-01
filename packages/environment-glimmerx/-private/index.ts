// Reference the scaffolding for our merged declarations for third party modules so
// that vanilla TS will see those as long as authors have
// `import '@glint/environment-glimmerx'` somewhere in their project.

/// <reference path="../globals/index.d.ts" />
/// <reference path="./dsl/integration-declarations.d.ts" />
