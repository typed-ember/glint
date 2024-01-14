export default {
  fileTypes: ['js', 'ts'],
  injectionSelector: 'L:source.js -comment -(string -meta.embedded), L:source.ts -comment -(string -meta.embedded)',
  injections: {
    'L:source': {
      patterns: [
        {
          match: '<',
          name: 'invalid.illegal.bad-angle-bracket.html',
        },
      ],
    },
  },
  patterns: [
    {
      contentName: 'meta.embedded.block.html',
      begin: '(?x)(\\b(?:\\w+\\.)*(?:hbs|html)\\s*)(`)',
      beginCaptures: {
        1: {
          name: 'entity.name.function.tagged-template.js',
        },
        2: {
          name: 'punctuation.definition.string.template.begin.js',
        },
      },
      end: '(`)',
      endCaptures: {
        0: {
          name: 'string.js',
        },
        1: {
          name: 'punctuation.definition.string.template.end.js',
        },
      },
      patterns: [
        {
          include: 'source.ts#template-substitution-element',
        },
        {
          include: 'text.html.ember-handlebars',
        },
      ],
    },
    {
      begin: '((createTemplate|hbs|html))(\\()',
      contentName: 'meta.embedded.block.html',
      beginCaptures: {
        1: {
          name: 'entity.name.function.ts',
        },
        2: {
          name: 'meta.function-call.ts',
        },
        3: {
          name: 'meta.brace.round.ts',
        },
      },
      end: '(\\))',
      endCaptures: {
        1: {
          name: 'meta.brace.round.ts',
        },
      },
      patterns: [
        {
          begin: '((`|\'|"))',
          beginCaptures: {
            1: {
              name: 'string.template.ts',
            },
            2: {
              name: 'punctuation.definition.string.template.begin.ts',
            },
          },
          end: '((`|\'|"))',
          endCaptures: {
            1: {
              name: 'string.template.ts',
            },
            2: {
              name: 'punctuation.definition.string.template.end.ts',
            },
          },
          patterns: [
            {
              include: 'text.html.ember-handlebars',
            },
          ],
        },
      ],
    },
    {
      begin: '((precompileTemplate)\\s*)(\\()',
      beginCaptures: {
        1: {
          name: 'entity.name.function.ts',
        },
        2: {
          name: 'meta.function-call.ts',
        },
        3: {
          name: 'meta.brace.round.ts',
        },
      },
      end: '(\\))',
      endCaptures: {
        1: {
          name: 'meta.brace.round.ts',
        },
      },
      patterns: [
        {
          begin: '((`|\'|"))',
          contentName: 'meta.embedded.block.html',
          beginCaptures: {
            1: {
              name: 'string.template.ts',
            },
            2: {
              name: 'punctuation.definition.string.template.begin.ts',
            },
          },
          end: '((`|\'|"))',
          endCaptures: {
            1: {
              name: 'string.template.ts',
            },
            2: {
              name: 'punctuation.definition.string.template.end.ts',
            },
          },
          patterns: [
            {
              include: 'text.html.ember-handlebars',
            },
          ],
        },
        {
          include: 'source.ts#object-literal',
        },
        {
          include: 'source.ts',
        },
      ],
    },
  ],
  scopeName: 'inline.hbs',
};
