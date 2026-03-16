import { GlintExtensionPreprocess } from '@glint/ember-tsc/config-types';
import { GLOBAL_TAG, PreprocessData, TemplateLocation } from './common.js';

const TEMPLATE_START = `[${GLOBAL_TAG}\``;
const TEMPLATE_END = '`]';

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

    let transformedStart = contents.length;
    contents += TEMPLATE_START;

    let templateContent = source.slice(startTagEnd, endTagOffset);
    let escapedContent = templateContent.replaceAll('${{', '\\${{').replaceAll('`', '\\`');
    contents += escapedContent;
    contents += TEMPLATE_END;
    let transformedEnd = contents.length;

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
