import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import glimmerJavascript from './source.gjs.mjs';
import glimmerTypescript from './source.gts.mjs';
import inlineHandlebars from './inline.hbs.mjs';
import inlineTemplate from './inline.template.mjs';
import emberHandlebars from './text.html.ember-handlebars.mjs';
import markdownGlimmer from './markdown.glimmer.codeblock.mjs';

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const [inlineTemplateInjectionSelectorGJS, inlineTemplateInjectionSelectorGTS] =
  inlineTemplate.injectionSelector.split(', ');

function mergeGlimmerSourceGrammars(grammar, injectionSelector) {
  // copy patterns and repository to avoid mutating the original grammars
  const copiedEmberHandlebarPatterns = deepCopy(emberHandlebars.patterns);
  const copiedEmberHandlebarRepository = deepCopy(emberHandlebars.repository);
  const copiedInlineTemplatePatterns = deepCopy(inlineTemplate.patterns);
  const copiedInlineHandlebarsPatterns = deepCopy(inlineHandlebars.patterns);

  grammar.injections = {
    [injectionSelector]: {
      patterns: [{ include: '#main' }],
    },
  };

  grammar.patterns.push({ include: '#main' });

  grammar.repository = {
    main: {
      patterns: [...copiedInlineTemplatePatterns, ...copiedInlineHandlebarsPatterns],
    },
    ...copiedEmberHandlebarRepository,
  };

  // Embedded Template With Args
  const embeddedTemplateWithArgs = grammar.repository.main.patterns.find(
    (pattern) => pattern.name === 'meta.js.embeddedTemplateWithArgs',
  );
  embeddedTemplateWithArgs.patterns.find((pattern) => pattern.begin === '(>)').patterns = [
    ...copiedEmberHandlebarPatterns,
  ];

  const tagLikeContent = embeddedTemplateWithArgs.patterns.find((pattern) => pattern.begin === '(?<=\\<template)');
  tagLikeContent.patterns = [
    {
      include: '#tag-like-content',
    },
  ];

  // Embedded Template Without Args
  const embeddedTemplateWithoutArgs = grammar.repository.main.patterns.find(
    (pattern) => pattern.name === 'meta.js.embeddedTemplateWithoutArgs',
  );
  embeddedTemplateWithoutArgs.patterns = [...copiedEmberHandlebarPatterns];

  // Tagged template (hbs/html)
  const taggedTemplate = grammar.repository.main.patterns.find(
    (pattern) => pattern.begin === '(?x)(\\b(?:\\w+\\.)*(?:hbs|html)\\s*)(`)',
  );
  const filteredPatterns = taggedTemplate.patterns.filter(
    (pattern) => pattern.include !== 'text.html.ember-handlebars',
  );
  taggedTemplate.patterns = [...filteredPatterns, ...copiedEmberHandlebarPatterns];

  // createTemplate/hbs/html functions
  const createTemplate = grammar.repository.main.patterns
    .find((pattern) => pattern.begin === '((createTemplate|hbs|html))(\\()')
    .patterns.find((pattern) => pattern.begin === '((`|\'|"))');

  createTemplate.patterns = [...copiedEmberHandlebarPatterns];

  // precompileTemplate function
  const precompileTemplate = grammar.repository.main.patterns
    .find((pattern) => pattern.begin === '((precompileTemplate)\\s*)(\\()')
    .patterns.find((pattern) => pattern.begin === '((`|\'|"))');

  precompileTemplate.patterns = [...copiedEmberHandlebarPatterns];
}

mergeGlimmerSourceGrammars(glimmerJavascript, inlineTemplateInjectionSelectorGJS);
mergeGlimmerSourceGrammars(glimmerTypescript, inlineTemplateInjectionSelectorGTS);

function mergeMarkdownGrammar() {
  const copiedInlineTemplatePatterns = deepCopy(inlineTemplate.patterns);
  const copiedInlineHandlebarsPatterns = deepCopy(inlineHandlebars.patterns);

  markdownGlimmer.patterns.push(...copiedInlineTemplatePatterns, ...copiedInlineHandlebarsPatterns);
}

mergeMarkdownGrammar();

const grammars = [
  glimmerJavascript,
  glimmerTypescript,
  inlineHandlebars,
  inlineTemplate,
  emberHandlebars,
  markdownGlimmer,
];

const outDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../');

const errors = [];

console.log('Writing grammars...\n');

for (const grammar of grammars) {
  const fileName = `${grammar.scopeName}.json`;
  const filePath = resolve(outDirectory, fileName);

  try {
    writeFileSync(filePath, JSON.stringify(grammar, null, 2));
    console.log(`✅ ${fileName}`);
  } catch (error) {
    console.error(`❌ ${fileName}`);
    errors.push({ file: fileName, error });
  }
}

if (errors.length) {
  console.error(`💀 ${errors.length} grammars failed to write to ${outDirectory}`);
  for (const { file, error } of errors) {
    console.log(`\n${'-'.repeat(file.length)}\n${file}\n${'-'.repeat(file.length)}`);
    console.error(error);
  }
  process.exitCode = 1;
} else {
  console.log(`\n🎉 All grammars written to ${outDirectory}`);
}
