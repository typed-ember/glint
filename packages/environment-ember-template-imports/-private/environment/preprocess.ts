import { GlintExtensionPreprocess } from '@glint/core/config-types';
import { parseTemplates } from 'ember-template-imports';
import { GLOBAL_TAG, PreprocessData, TemplateLocation } from './common';

const TEMPLATE_START = `[${GLOBAL_TAG}\``;
const TEMPLATE_END = '`]';

export const preprocess: GlintExtensionPreprocess<PreprocessData> = (source, path) => {
  let templates = parseTemplates(source, path, { templateTag: 'template' }).filter(
    (match) => match.type === 'template-tag'
  );

  let templateLocations: Array<TemplateLocation> = [];
  let segments: Array<string> = [];
  let sourceOffset = 0;
  let delta = 0;

  for (let template of templates) {
    let { start, end } = template;
    let startTagLength = template.start[0].length;
    let endTagLength = template.end[0].length;
    let startTagOffset = start.index ?? -1;
    let endTagOffset = end.index ?? -1;

    if (startTagOffset === -1 || endTagOffset === -1) continue;

    let transformedStart = startTagOffset - delta;

    segments.push(source.slice(sourceOffset, startTagOffset));
    segments.push(TEMPLATE_START);
    delta += startTagLength - TEMPLATE_START.length;

    let transformedEnd = endTagOffset - delta + TEMPLATE_END.length;

    segments.push(source.slice(startTagOffset + startTagLength, endTagOffset));
    segments.push(TEMPLATE_END);
    delta += endTagLength - TEMPLATE_END.length;

    sourceOffset = endTagOffset + endTagLength;

    templateLocations.push({
      startTagOffset,
      endTagOffset,
      startTagLength,
      endTagLength,
      transformedStart,
      transformedEnd,
    });
  }

  segments.push(source.slice(sourceOffset));

  return {
    contents: segments.join(''),
    data: {
      templateLocations,
    },
  };
};
