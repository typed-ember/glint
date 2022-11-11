import { GlintEnvironmentConfig } from '@glint/core/config-types';
import { preprocess } from './preprocess';
import { transform } from './transform';

export default function emberTemplateImportsEnvironment(): GlintEnvironmentConfig {
  return {
    tags: {
      'ember-template-imports': {
        hbs: {
          typesModule: '@glint/environment-ember-template-imports/-private/dsl',
          specialForms: {
            globals: {
              if: 'if',
              unless: 'if-not',
              yield: 'yield',
            },
            imports: {
              '@ember/helper': {
                array: 'array-literal',
                hash: 'object-literal',
              },
            },
          },
          globals: [
            'action',
            'component',
            'debugger',
            'each',
            'each-in',
            'has-block',
            'has-block-params',
            'if',
            'in-element',
            'let',
            'log',
            'mount',
            'mut',
            'outlet',
            'unbound',
            'unless',
            'with',
            'yield',
          ],
        },
      },
    },
    extensions: {
      '.gts': {
        kind: 'typed-script',
        preprocess,
        transform,
      },
      '.gjs': {
        kind: 'untyped-script',
        preprocess,
        transform,
      },
    },
  };
}
