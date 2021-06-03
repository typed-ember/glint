// Import the scaffolding for the template registry and our merged declarations
// for third party modules so that vanilla TS will see those as long as authors
// have `import '@glint/environment-ember-loose'` somewhere in their project.
import type {} from '../registry';
import type {} from './dsl/integration-declarations';

export { ComponentSignature, ComponentLike, ComponentWithBoundArgs } from './utilities';
