import {
  GlintEmitMetadata,
  GlintSpecialForm,
  GlintSpecialFormConfig,
  GlintTagConfig,
} from '@glint/ember-tsc/config-types';
import type ts from 'typescript';
import { GlintEnvironment } from '../../../config/index.js';
import { assert, TSLib } from '../../util.js';
import { templateToTypescript } from '../template-to-typescript.js';
import { Directive, Range, SourceFile, TransformError } from '../transformed-module.js';
import { CorrelatedSpansResult, isEmbeddedInClass, PartialCorrelatedSpan } from './index.js';

export function calculateTaggedTemplateSpans(
  ts: TSLib,
  node: ts.TaggedTemplateExpression,
  meta: GlintEmitMetadata | undefined,
  script: SourceFile,
  environment: GlintEnvironment,
): CorrelatedSpansResult {
  let directives: Array<Directive> = [];
  let errors: Array<TransformError> = [];
  let partialSpans: Array<PartialCorrelatedSpan> = [];
  let tag = node.tag;

  if (!ts.isIdentifier(tag)) {
    return { errors, directives, partialSpans };
  }

  let importedBindings = collectImportedBindings(ts, tag.getSourceFile());
  let info = resolveTagInfo(importedBindings, tag, environment);
  if (info) {
    assert(
      ts.isNoSubstitutionTemplateLiteral(node.template),
      'No interpolated values in template strings',
    );

    let { typesModule, globals } = info.tagConfig;
    let template = node.template.rawText ?? node.template.text;

    // environment-specific transforms may emit templateLocation in meta, in
    // which case we use that. Otherwise we use the reported location from the
    // node itself (which is presumably correct because no transform has messed
    // with it).
    let templateLocation = meta?.templateLocation ?? {
      start: node.getStart(),
      end: node.getEnd(),
      contentStart: node.template.getStart() + 1,
      contentEnd: node.template.getEnd() - 1,
    };

    let embeddingSyntax = {
      prefix: script.contents.slice(templateLocation.start, templateLocation.contentStart),
      suffix: script.contents.slice(templateLocation.contentEnd, templateLocation.end),
    };

    let preamble = [];
    if (!info.importedBinding.synthetic) {
      preamble.push(`${tag.text};`);
    }

    let specialForms = collectSpecialForms(importedBindings, info.tagConfig.specialForms ?? {});
    let transformedTemplate = templateToTypescript(template, {
      typesModule: typesModule,
      meta,
      preamble,
      globals,
      embeddingSyntax,
      specialForms,
      backingValue: isEmbeddedInClass(ts, node) ? 'this' : undefined,
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
            start: tag.getStart(),
            end: tag.getEnd(),
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
): { importedBinding: ImportedBinding; tagConfig: GlintTagConfig } | undefined {
  let importedBinding = importedBindings[tag.text];
  if (!importedBinding) {
    return;
  }

  for (let [importSource, tags] of Object.entries(environment.getConfiguredTemplateTags())) {
    for (let [importSpecifier, tagConfig] of Object.entries(tags)) {
      if (
        importSource === importedBinding.source &&
        importSpecifier === importedBinding.specifier
      ) {
        return { importedBinding, tagConfig };
      }
    }
  }
}

type ImportedBinding = { specifier: string; source: string; synthetic: boolean };
type ImportedBindings = Record<string, ImportedBinding>;

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
