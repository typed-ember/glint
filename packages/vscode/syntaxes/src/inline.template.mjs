export default {
  fileTypes: ['gjs', 'gts'],
  injectionSelector: 'L:source.gjs -comment -(string -meta.embedded), L:source.gts -comment -(string -meta.embedded)',
  patterns: [
    {
      name: 'meta.js.embeddedTemplateWithoutArgs',
      begin: '\\s*(<)(template)\\s*(>)',
      beginCaptures: {
        1: {
          name: 'punctuation.definition.tag.html',
        },
        2: {
          name: 'entity.name.tag.other.html',
        },
        3: {
          name: 'punctuation.definition.tag.html',
        },
      },
      end: '(</)(template)(>)',
      endCaptures: {
        1: {
          name: 'punctuation.definition.tag.html',
        },
        2: {
          name: 'entity.name.tag.other.html',
        },
        3: {
          name: 'punctuation.definition.tag.html',
        },
      },
      patterns: [
        {
          include: 'text.html.ember-handlebars',
        },
      ],
    },
    {
      name: 'meta.js.embeddedTemplateWithArgs',
      begin: '(<)(template)',
      beginCaptures: {
        1: {
          name: 'punctuation.definition.tag.html',
        },
        2: {
          name: 'entity.name.tag.other.html',
        },
      },
      end: '(</)(template)(>)',
      endCaptures: {
        1: {
          name: 'punctuation.definition.tag.html',
        },
        2: {
          name: 'entity.name.tag.other.html',
        },
        3: {
          name: 'punctuation.definition.tag.html',
        },
      },
      patterns: [
        {
          begin: '(?<=\\<template)',
          end: '(?=\\>)',
          patterns: [
            {
              include: 'text.html.ember-handlebars#tag-like-content',
            },
          ],
        },
        {
          begin: '(>)',
          beginCaptures: {
            1: {
              name: 'punctuation.definition.tag.end.js',
            },
          },
          end: '(?=</template>)',
          contentName: 'meta.html.embedded.block',
          patterns: [
            {
              include: 'text.html.ember-handlebars',
            },
          ],
        },
      ],
    },
  ],
  scopeName: 'inline.template',
};
