import { GlintExtensionPreprocess } from '@glint/core/config-types';
import { GLOBAL_TAG, PreprocessData, TemplateLocation } from './common';

const TEMPLATE_START = `[${GLOBAL_TAG}\``;
const TEMPLATE_END = '`]';

// content-tag 1.2.2:
//   The current file is a CommonJS module whose imports will produce 'require' calls;
//   however, the referenced file is an ECMAScript module and cannot be imported with 'require'.
//   Consider writing a dynamic 'import("content-tag")' call instead.
//   To convert this file to an ECMAScript module, change its file extension to '.mts',
//   or add the field `"type": "module"` to 'glint/packages/environment-ember-template-imports/package.json'.ts(1479)
//
// ...Except,
//    > the referenced file is an ECMAScript module
//
//    package.json#exports does refer to a cjs file if required, so TS should be resolving the `require`
//    entries not the `import` entries.
//
//    https://github.com/embroider-build/content-tag/blob/v1.2.2-content-tag/package.json#L13-L21
//
// @ts-expect-error see above
import { Preprocessor } from 'content-tag';
const p = new Preprocessor();

export const preprocess: GlintExtensionPreprocess<PreprocessData> = (source, path) => {
  // NOTE: https://github.com/embroider-build/content-tag/issues/45
  //       All indicies are byte-index, not char-index.
  let templates = p.parse(source, path);

  let templateLocations: Array<TemplateLocation> = [];
  let segments: Array<string> = [];
  let sourceOffsetBytes = 0;
  let deltaBytes = 0;

  // @ts-expect-error TS couldn't find @types/node, which are specified
  // in the root package.json
  let sourceBuffer = Buffer.from(source);

  for (let template of templates) {
    let startTagLengthBytes = template.startRange.end - template.startRange.start;
    let endTagLengthBytes = template.endRange.end - template.endRange.start;
    let startTagOffsetBytes = template.startRange.start;
    let endTagOffsetBytes = template.endRange.start;

    // if (startTagOffset === -1 || endTagOffset === -1) continue;

    let transformedStartBytes = startTagOffsetBytes - deltaBytes;

    /**
     * TODO: we want content-tag to manage all this for us, as managing indicies
     *       can be error-prone.
     *
     * SEE: https://github.com/embroider-build/content-tag/issues/39#issuecomment-1832443310
     */
    let prefixingSegment = sourceBuffer.slice(sourceOffsetBytes, startTagOffsetBytes);
    segments.push(prefixingSegment.toString());
    segments.push(TEMPLATE_START);

    // For TEMPLATE_START & TEMPLATE_END, characters === bytes
    deltaBytes += startTagLengthBytes - TEMPLATE_START.length;

    let transformedEnd = endTagOffsetBytes - deltaBytes + TEMPLATE_END.length;

    let templateContentSegment = sourceBuffer.slice(
      startTagOffsetBytes + startTagLengthBytes,
      endTagOffsetBytes
    );
    segments.push(templateContentSegment.toString());
    segments.push(TEMPLATE_END);
    deltaBytes += endTagLengthBytes - TEMPLATE_END.length;

    sourceOffsetBytes = endTagOffsetBytes + endTagLengthBytes;

    // TODO: is there a way to convert bytes to chars?
    //       I think maybe all of this code needs to live in content-tag,
    //       and give us the option to generate this sort of structure
    templateLocations.push({
      startTagOffset: startTagOffsetBytes,
      endTagOffset: endTagOffsetBytes,
      startTagLength: startTagLengthBytes,
      endTagLength: endTagLengthBytes,
      transformedStart: transformedStartBytes,
      transformedEnd,
    });
  }

  segments.push(sourceBuffer.slice(sourceOffsetBytes).toString());

  return {
    contents: segments.join(''),
    data: {
      templateLocations,
    },
  };
};
