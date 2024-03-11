import { GlintExtensionPreprocess } from '@glint/core/config-types';
import { GLOBAL_TAG, PreprocessData, TemplateLocation } from './common';

const TEMPLATE_START = `[${GLOBAL_TAG}\``;
const TEMPLATE_END = '`]';

// content-tag 1.2.2+ (including v2+):
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
  let templates = p.parse(source, { filename: path });

  let templateLocations: Array<TemplateLocation> = [];
  let segments: Array<string> = [];
  let sourceOffsetBytes = 0;
  let deltaBytes = 0;

  let sourceBuffer = getBuffer(source);

  for (let template of templates) {
    let startTagLengthBytes = template.startRange.end - template.startRange.start;
    let endTagLengthBytes = template.endRange.end - template.endRange.start;
    let startTagOffsetBytes = template.startRange.start;
    let endTagOffsetBytes = template.endRange.start;
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

    templateLocations.push({
      startTagOffset: byteToCharIndex(source, startTagOffsetBytes),
      endTagOffset: byteToCharIndex(source, endTagOffsetBytes),
      startTagLength: byteToCharIndex(source, startTagLengthBytes),
      endTagLength: byteToCharIndex(source, endTagLengthBytes),
      transformedStart: byteToCharIndex(source, transformedStartBytes),
      transformedEnd: byteToCharIndex(source, transformedEnd),
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

function byteToCharIndex(str: string, byteOffset: number): number {
  const buf = getBuffer(str);
  return buf.slice(0, byteOffset).toString().length;
}

const BufferMap = new Map();

function getBuffer(str: string): Buffer {
  let buf = BufferMap.get(str);
  if (!buf) {
    buf = Buffer.from(str);
    BufferMap.set(str, buf);
  }
  return buf;
}
