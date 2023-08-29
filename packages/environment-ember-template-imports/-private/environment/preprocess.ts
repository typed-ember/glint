import { GlintExtensionPreprocess } from '@glint/core/config-types';
import { GLOBAL_TAG, PreprocessData, TemplateLocation } from './common';
/**
 * We don't need to actually generate the code that would be emitted for
 * a real app to build, we can use placeholders, so we have less offsets
 * to worry about (precompile, setComponentTemplate, their imports, etc)
 */
const TEMPLATE_START = `[${GLOBAL_TAG}\``;
const TEMPLATE_END = '`]';

// NOTE: This import is a lie -- We are not real ESM, and this is compiled to CJS.
//       ESM usage would be different here, and this is the CJS version of content-tag.
import { Preprocessor } from 'content-tag';
const p = new Preprocessor();

interface Parsed {
  type: 'expression' | 'class-member';
  tagName: 'template';
  contents: string;
  range: {
    start: number;
    end: number;
  };
  contentRange: {
    start: number;
    end: number;
  };
  startRange: {
    end: number;
    start: number;
  };
  endRange: {
    start: number;
    end: number;
  };
}

export const preprocess: GlintExtensionPreprocess<PreprocessData> = (source, path) => {
  let templates = p.parse(source, path) as Parsed[];

  let templateLocations: Array<TemplateLocation> = [];
  let segments: Array<string> = [];
  let sourceOffset = 0;
  let delta = 0;

  for (let template of templates) {
    let startTagLength = template.startRange.end - template.startRange.start;
    let endTagLength = template.endRange.end - template.endRange.start;
    let startTagOffset = template.startRange.start;
    let endTagOffset = template.endRange.start;

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
