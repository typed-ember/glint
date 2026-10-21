// Private API for ember-content-mapper. Not covered by semver: these follow the
// transform's internals and can change in any release.

/** Loads the Glint environment that drives the transform for a project. */
export { GlintEnvironment } from '../config/index.js';

/** A span of transformed code and the template range it came from. */
export type { CorrelatedSpan } from '../transform/template/transformed-module.js';

/** An error the transform reports instead of failing, such as a template parse error. */
export type { TransformError } from '../transform/template/transformed-module.js';

/** The transform's output: the rewritten module and its correlated spans. */
export type { default as TransformedModule } from '../transform/template/transformed-module.js';

/** The tree that maps transformed code back to Glimmer AST nodes. */
export type { default as GlimmerASTMappingTree } from '../transform/template/glimmer-ast-mapping-tree.js';
