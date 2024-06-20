function regexes(extension) {
  return {
    fencedCodeBlock: {
      begin: `(^|\\G)(\\s*)(\\\`{3,}|~{3,})\\s*(?i:(${extension})(\\s+[^\`~]*)?$)`,
      end: '(^|\\G)(\\2|\\s{0,3})(\\3)\\s*$',
    },
    embeddedBlock: {
      begin: '(^|\\G)(\\s*)(.*)',
      while: '(^|\\G)(?!\\s*([`~]{3,})\\s*$)',
    },
  };
}

export default {
  fileTypes: [],
  injectionSelector: 'L:text.html.markdown',
  patterns: [
    {
      include: '#gts-code-block',
    },
    {
      include: '#gjs-code-block',
    },
  ],
  repository: {
    'gts-code-block': {
      name: 'markup.fenced_code.block.markdown',
      begin: regexes('gts').fencedCodeBlock.begin,
      end: regexes('gts').fencedCodeBlock.end,
      beginCaptures: {
        3: {
          name: 'punctuation.definition.markdown',
        },
        4: {
          name: 'fenced_code.block.language.markdown',
        },
        5: {
          name: 'fenced_code.block.language.attributes.markdown',
        },
      },
      endCaptures: {
        3: {
          name: 'punctuation.definition.markdown',
        },
      },
      patterns: [
        {
          begin: regexes('gts').embeddedBlock.begin,
          while: regexes('gts').embeddedBlock.while,
          contentName: 'meta.embedded.block.gts',
          patterns: [
            {
              include: 'source.gts',
            },
          ],
        },
      ],
    },
    'gjs-code-block': {
      name: 'markup.fenced_code.block.markdown',
      begin: regexes('gjs').fencedCodeBlock.begin,
      end: regexes('gjs').fencedCodeBlock.end,
      beginCaptures: {
        3: {
          name: 'punctuation.definition.markdown',
        },
        4: {
          name: 'fenced_code.block.language.markdown',
        },
        5: {
          name: 'fenced_code.block.language.attributes.markdown',
        },
      },
      endCaptures: {
        3: {
          name: 'punctuation.definition.markdown',
        },
      },
      patterns: [
        {
          begin: regexes('gjs').embeddedBlock.begin,
          while: regexes('gjs').embeddedBlock.while,
          contentName: 'meta.embedded.block.gjs',
          patterns: [
            {
              include: 'source.gjs',
            },
          ],
        },
      ],
    },
  },
  scopeName: 'markdown.glimmer.codeblock',
};
