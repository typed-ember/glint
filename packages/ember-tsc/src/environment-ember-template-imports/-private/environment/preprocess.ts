import { GlintExtensionPreprocess } from '@glint/ember-tsc/config-types';
import { GLOBAL_TAG, PreprocessData, TemplateLocation } from './common.js';

// A `<template>` becomes a tagged-template expression `___T`...``. In a class
// body a bare expression is not a valid member, so there it is wrapped in a
// computed-property name `[___T`...`]` (rewritten to a static block during
// transform). In every other position it is emitted bare: that keeps a
// user-authored array such as `[<template/>]` a single array literal, so it
// can never be confused with — and collapsed into — the wrapper.
const TAG_OPEN = `${GLOBAL_TAG}\``;
const TAG_CLOSE = '`';

import { Preprocessor } from 'content-tag';
const p = new Preprocessor();

export const preprocess: GlintExtensionPreprocess<PreprocessData> = (source, path) => {
  let templates = p.parse(source, { filename: path });

  let templateLocations: Array<TemplateLocation> = [];
  let contents = '';
  let sourceOffset = 0;

  for (let template of templates) {
    let startTagOffset = template.startRange.startUtf16Codepoint;
    let startTagEnd = template.startRange.endUtf16Codepoint;
    let endTagOffset = template.endRange.startUtf16Codepoint;
    let endTagEnd = template.endRange.endUtf16Codepoint;

    contents += source.slice(sourceOffset, startTagOffset);

    let isClassMember = template.type === 'class-member';

    if (isClassMember) contents += '[';

    // `transformedStart`/`transformedEnd` bracket the tag literal itself
    // (`___T`...``), excluding any class-member `[ ]`, so they line up exactly
    // with the tagged-template node's `getStart()`/`getEnd()` during transform.
    let transformedStart = contents.length;
    contents += TAG_OPEN;

    let templateContent = source.slice(startTagEnd, endTagOffset);
    let escapedContent = templateContent.replaceAll('${{', '\\${{').replaceAll('`', '\\`');
    contents += escapedContent;
    contents += TAG_CLOSE;
    let transformedEnd = contents.length;

    if (isClassMember) contents += ']';

    sourceOffset = endTagEnd;
    templateLocations.push({
      startTagOffset,
      endTagOffset,
      startTagLength: startTagEnd - startTagOffset,
      endTagLength: endTagEnd - endTagOffset,
      transformedStart,
      transformedEnd,
    });
  }

  contents += source.slice(sourceOffset);
  return {
    contents,
    data: {
      templateLocations,
    },
  };
};
