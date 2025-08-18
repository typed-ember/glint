"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preprocess = void 0;
const common_1 = require("./common");
const TEMPLATE_START = `[${common_1.GLOBAL_TAG}\``;
const TEMPLATE_END = '`]';
const content_tag_1 = require("content-tag");
const p = new content_tag_1.Preprocessor();
const preprocess = (source, path) => {
    // NOTE: https://github.com/embroider-build/content-tag/issues/45
    //       All indicies are byte-index, not char-index.
    let templates = p.parse(source, { filename: path });
    let templateLocations = [];
    let contents = '';
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
        let prefixingSegment = sourceBuffer.subarray(sourceOffsetBytes, startTagOffsetBytes);
        contents = contents.concat(prefixingSegment.toString());
        contents = contents.concat(TEMPLATE_START);
        // For TEMPLATE_START & TEMPLATE_END, characters === bytes
        deltaBytes += startTagLengthBytes - TEMPLATE_START.length;
        let transformedEnd = endTagOffsetBytes - deltaBytes + TEMPLATE_END.length;
        let templateContentSegment = sourceBuffer.subarray(startTagOffsetBytes + startTagLengthBytes, endTagOffsetBytes);
        let templateContentSegmentString = templateContentSegment.toString();
        let escapedTemplateContentSegment = templateContentSegmentString
            .replaceAll('$', '\\$')
            .replaceAll('`', '\\`');
        deltaBytes += templateContentSegmentString.length - escapedTemplateContentSegment.length;
        contents = contents.concat(escapedTemplateContentSegment);
        contents = contents.concat(TEMPLATE_END);
        deltaBytes += endTagLengthBytes - TEMPLATE_END.length;
        sourceOffsetBytes = endTagOffsetBytes + endTagLengthBytes;
        templateLocations.push({
            startTagOffset: byteToCharIndex(source, startTagOffsetBytes),
            endTagOffset: byteToCharIndex(source, endTagOffsetBytes),
            startTagLength: byteToCharIndex(source, startTagLengthBytes),
            endTagLength: byteToCharIndex(source, endTagLengthBytes),
            transformedStart: byteToCharIndex(contents, transformedStartBytes),
            transformedEnd: byteToCharIndex(contents, transformedEnd),
        });
    }
    contents = contents.concat(sourceBuffer.subarray(sourceOffsetBytes).toString());
    return {
        contents,
        data: {
            templateLocations,
        },
    };
};
exports.preprocess = preprocess;
function byteToCharIndex(str, byteOffset) {
    const buf = getBuffer(str);
    return buf.subarray(0, byteOffset).toString().length;
}
const BufferMap = new Map();
function getBuffer(str) {
    let buf = BufferMap.get(str);
    if (!buf) {
        buf = Buffer.from(str);
        BufferMap.set(str, buf);
    }
    return buf;
}
//# sourceMappingURL=preprocess.js.map