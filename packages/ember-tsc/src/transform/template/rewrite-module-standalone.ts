import * as path from 'node:path';
import { GlintEnvironment } from '../../config/index.js';
import type { PreprocessData } from '../../environment-ember-template-imports/-private/environment/common.js';
import { EmbeddedTemplate, PartialCorrelatedSpan } from './inlining/index.js';
import { scanScript } from './inlining/script-scanner.js';
import { calculateTemplateSpans } from './inlining/tagged-strings.js';
import {
  buildTransformedModule,
  parseError,
  RewriteInput,
  toTransformError,
} from './rewrite-module.js';
import TransformedModule, { Directive, TransformError } from './transformed-module.js';

/**
 * Like `rewriteModule`, but without a TypeScript compiler API.
 *
 * `rewriteModule` parses the content-tag-preprocessed script with the
 * `TSLib` it is given and reads three things off the AST: where each
 * template sits, how its `{{this}}` binds, and which names the module imports.
 * Here those come from content-tag's own parse output (template ranges and
 * whether a template is a class member) and a lightweight scan of the script
 * (`script-scanner.ts`), so embedders that pair the transform with a compiler
 * that has no JS API (TypeScript 7, build plugins, content mappers) do not
 * need a second TypeScript install just to run the transform.
 *
 * The output is identical to `rewriteModule`'s for the same input; the
 * language server, tsserver plugin and `ember-tsc` keep using `rewriteModule`.
 */
export function rewriteModuleStandalone(
  { script }: RewriteInput,
  environment: GlintEnvironment,
): TransformedModule | null {
  let { filename, contents } = script;
  let { preprocess } = environment.getConfigForExtension(path.extname(filename)) ?? {};

  if (!preprocess) {
    return null;
  }

  let errors: Array<TransformError> = [];
  let directives: Array<Directive> = [];
  let partialSpans: Array<PartialCorrelatedSpan> = [];

  let data: PreprocessData;
  try {
    data = preprocess(contents, filename).data;
  } catch (e) {
    errors.push(toTransformError(parseError(e, filename), script));
    return buildTransformedModule(script, { errors, directives, partialSpans });
  }

  let templates = data.templateLocations.map((location) => ({
    location,
    // The `<template>` tags themselves, matching `templateLocation` in
    // `environment-ember-template-imports/-private/environment/transform.ts`.
    start: location.startTagOffset,
    end: location.endTagOffset + location.endTagLength,
    contentStart: location.startTagOffset + location.startTagLength,
    contentEnd: location.endTagOffset,
  }));

  let { imports, templates: contexts } = scanScript(contents, templates);

  for (let [index, template] of templates.entries()) {
    let embedded = toEmbeddedTemplate(template, contexts[index], contents);
    let result = calculateTemplateSpans(embedded, imports, script, environment);
    errors.push(...result.errors);
    directives.push(...result.directives);
    partialSpans.push(...result.partialSpans);
  }

  return buildTransformedModule(script, { errors, directives, partialSpans });
}

function toEmbeddedTemplate(
  template: {
    location: PreprocessData['templateLocations'][number];
    start: number;
    end: number;
    contentStart: number;
    contentEnd: number;
  },
  context: ReturnType<typeof scanScript>['templates'][number],
  contents: string,
): EmbeddedTemplate {
  let { start, end, contentStart, contentEnd } = template;
  let templateLocation = { start, end, contentStart, contentEnd };
  let text = contents.slice(contentStart, contentEnd);

  if (template.location.type === 'class-member') {
    // The class's own template. `rewriteModule` rewrites the preprocessed
    // `[___T`...`]` member into a static block and emits the template inside
    // it; see `isETITemplateProperty` in the environment transform.
    return {
      template: text,
      templateLocation,
      thisBinding: 'backing-class',
      prepend: 'static { ',
      append: ' }',
    };
  }

  return {
    template: text,
    templateLocation,
    thisBinding: context.thisBinding,
    // A template that is the whole of an expression statement is the
    // implicit default export (RFC 931); see `isETIDefaultTemplate` and
    // `isETIDefaultSatisfiesTemplate` in the environment transform.
    prepend: context.isExpressionStatement ? 'export default ' : undefined,
  };
}
