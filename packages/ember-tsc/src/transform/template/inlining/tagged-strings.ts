import {
  GlintEmitMetadata,
  GlintSpecialForm,
  GlintSpecialFormConfig,
  GlintTemplateConfig,
} from '@glint/ember-tsc/config-types';
import type ts from 'typescript';
import { GlintEnvironment } from '../../../config/index.js';
import { assert, TSLib } from '../../util.js';
import { templateToTypescript } from '../template-to-typescript.js';
import { Directive, Range, SourceFile, TransformError } from '../transformed-module.js';
import {
  CorrelatedSpansResult,
  EmbeddedTemplate,
  ImportedBinding,
  ImportedBindings,
  templateThisBinding,
  PartialCorrelatedSpan,
} from './index.js';

export function calculateTaggedTemplateSpans(
  ts: TSLib,
  node: ts.TaggedTemplateExpression,
  meta: GlintEmitMetadata | undefined,
  script: SourceFile,
  environment: GlintEnvironment,
): CorrelatedSpansResult {
  let tag = node.tag;

  if (!ts.isIdentifier(tag)) {
    return { errors: [], directives: [], partialSpans: [] };
  }

  let importedBindings = collectImportedBindings(ts, tag.getSourceFile());
  if (!resolveTagInfo(importedBindings, tag, environment)) {
    return { errors: [], directives: [], partialSpans: [] };
  }

  assert(
    ts.isNoSubstitutionTemplateLiteral(node.template),
    'No interpolated values in template strings',
  );

  // The gts/gjs transform records where the `<template>` sat in the original
  // source on every tag literal it synthesizes.
  let templateLocation = meta?.templateLocation;
  assert(templateLocation, 'Template literal is missing its original location');

  return calculateTemplateSpans(
    {
      // Use the cooked text (`text`) rather than `rawText`. For .gts files, the
      // gts preprocessor (see `environment-ember-template-imports/-private/
      // environment/preprocess.ts`) escapes backticks and `${{` sequences inside
      // template content so the wrapped chunk parses as a valid JS template
      // literal. `rawText` preserves those backslash-escapes as literal
      // characters, which inflates the template length by 1 per escape and
      // shifts every downstream source-map offset by the same amount (manifests
      // as hover/go-to-definition spans landing past the start of any identifier
      // that follows an escaped backtick or `${{` in the same template, e.g.
      // hyphenated keywords used after backtick-quoted text in a comment). The
      // cooked `text` reverses those escapes, restoring 1:1 correspondence with
      // the original source.
      template: node.template.text,
      templateLocation,
      thisBinding: templateThisBinding(ts, node),
      prepend: meta?.prepend,
      append: meta?.append,
    },
    importedBindings,
    script,
    environment,
  );
}

/**
 * Rewrites one embedded template into its TypeScript representation and
 * returns the resulting correlated span (plus any errors and directives). This
 * is the shared core behind `rewriteModule` and `rewriteModuleStandalone`.
 */
export function calculateTemplateSpans(
  embedded: EmbeddedTemplate,
  importedBindings: ImportedBindings,
  script: SourceFile,
  environment: GlintEnvironment,
): CorrelatedSpansResult {
  let directives: Array<Directive> = [];
  let errors: Array<TransformError> = [];
  let partialSpans: Array<PartialCorrelatedSpan> = [];

  let tagConfig = environment.getTemplateConfig();
  if (!tagConfig) {
    return { errors, directives, partialSpans };
  }

  let { typesModule, globals } = tagConfig;
  let { template, templateLocation, thisBinding, prepend, append } = embedded;

  let embeddingSyntax = {
    prefix: script.contents.slice(templateLocation.start, templateLocation.contentStart),
    suffix: script.contents.slice(templateLocation.contentEnd, templateLocation.end),
  };

  // The `<template>` form's backing import is always compiler-synthesized
  // (see `resolveTagInfo`), so there is never a user-written tag binding to
  // reference in a preamble.
  let preamble: Array<string> = [];

  let specialForms = collectSpecialForms(importedBindings, tagConfig.specialForms ?? {});

  // A lexical import should win over the environment's global keyword list,
  // because the import is the canonical reference to the value (and is
  // typed accordingly) while the global entry is a same-named alias.
  // Concretely: `import { on } from '@ember/modifier'` followed by
  // `{{on ...}}` must resolve to the imported `OnModifier`, not to the
  // `Globals.on` entry (typed as `never` on ember-source < 7.1 by the
  // `Ember71Only<...>` probe). Without this we surface
  // `TS2349: Type 'never' has no call signatures.` See typed-ember/glint#1113.
  //
  // Keyword-style globals (`if`, `unless`, `yield`, `component`, `modifier`,
  // `helper`) are deliberately exempt: their semantics are baked into the
  // template language, not derivable from an import. Even if a user imports
  // a same-named value, `{{(modifier ...)}}` still has to dispatch to the
  // `bind-invokable` special form (which routes through `Globals.modifier`).
  let keywordSpecialForms = tagConfig.specialForms?.globals ?? {};
  let effectiveGlobals = globals?.filter(
    (name) => name in keywordSpecialForms || !(name in importedBindings),
  );

  let transformedTemplate = templateToTypescript(template, {
    typesModule: typesModule,
    meta: { prepend, append, templateLocation },
    preamble,
    globals: effectiveGlobals,
    embeddingSyntax,
    specialForms,
    backingValue: thisBinding === 'backing-class' ? 'this' : undefined,
    lexicalThis: thisBinding === 'lexical',
    useJsDoc: environment.isUntypedScript(script.filename),
  });

  for (let { message, location } of transformedTemplate.errors) {
    if (location) {
      errors.push({
        source: script,
        message,
        location: addOffset(location, templateLocation.start),
      });
    } else {
      errors.push({
        source: script,
        message,
        location: {
          start: templateLocation.start,
          end: templateLocation.end,
        },
      });
    }
  }

  if (transformedTemplate.result) {
    partialSpans.push({
      originalFile: script,
      originalStart: templateLocation.start,
      originalLength: templateLocation.end - templateLocation.start,
      insertionPoint: templateLocation.start,
      transformedSource: transformedTemplate.result.code,
      glimmerAstMapping: transformedTemplate.result.mapping,
    });
  }

  return { errors, directives, partialSpans };
}

function addOffset(location: Range, offset: number): Range {
  return {
    start: location.start + offset,
    end: location.end + offset,
  };
}

function collectSpecialForms(
  importedBindings: ImportedBindings,
  config: GlintSpecialFormConfig,
): Record<string, GlintSpecialForm> {
  let specialForms: Record<string, GlintSpecialForm> = { ...config.globals };
  if (config.imports) {
    for (let [name, { specifier, source }] of Object.entries(importedBindings)) {
      let formForImport = config.imports[source]?.[specifier];
      if (formForImport) {
        specialForms[name] = formForImport;
      }
    }
  }
  return specialForms;
}

function resolveTagInfo(
  importedBindings: ImportedBindings,
  tag: ts.Identifier,
  environment: GlintEnvironment,
): { importedBinding: ImportedBinding; tagConfig: GlintTemplateConfig } | undefined {
  let importedBinding = importedBindings[tag.text];
  if (!importedBinding) {
    return;
  }

  // Only the compiler-generated `<template>` form is processed. Its backing
  // import is synthesized by the gts/gjs transform (see `addTagImport` in
  // `environment-ember-template-imports/-private/environment/transform.ts`) and
  // therefore has no position in the original source. User-authored tagged
  // templates (`hbs`...``) have a real import and are deliberately ignored —
  // Glint no longer supports tagged-string templates.
  if (!importedBinding.synthetic) {
    return;
  }

  let tagConfig = environment.getTemplateConfig();
  if (!tagConfig) {
    return;
  }

  return { importedBinding, tagConfig };
}

function collectImportedBindings(ts: TSLib, sourceFile: ts.SourceFile): ImportedBindings {
  let result: ImportedBindings = {};
  for (let statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      assert(ts.isStringLiteral(statement.moduleSpecifier));

      let { importClause } = statement;
      if (!importClause) continue;

      let synthetic = statement.pos === statement.end;

      if (importClause.name) {
        result[importClause.name.text] = {
          specifier: 'default',
          source: statement.moduleSpecifier.text,
          synthetic,
        };
      }

      if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
        for (let binding of importClause.namedBindings.elements) {
          result[binding.name.text] = {
            specifier: binding.propertyName?.text ?? binding.name.text,
            source: statement.moduleSpecifier.text,
            synthetic,
          };
        }
      }
    }
  }
  return result;
}
