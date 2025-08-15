import { GlintEnvironmentConfig, GlintSpecialFormConfig } from '@glint/core/config-types';
import { preprocess } from './preprocess';
import { transform } from './transform';

export default function emberTemplateImportsEnvironment(
  options: Record<string, unknown>,
): GlintEnvironmentConfig {
  let additionalSpecialForms =
    typeof options['additionalSpecialForms'] === 'object'
      ? (options['additionalSpecialForms'] as GlintSpecialFormConfig)
      : {};

  const additionalGlobalSpecialForms = additionalSpecialForms.globals ?? {};

  const additionalGlobals = Array.isArray(options['additionalGlobals'])
    ? options['additionalGlobals']
    : [];

  return {
    tags: {
      '@glint/environment-ember-template-imports/-private/tag': {
        hbs: {
          typesModule: '@glint/environment-ember-template-imports/-private/dsl',
          specialForms: {
            globals: {
              if: 'if',
              unless: 'if-not',
              yield: 'yield',
              component: 'bind-invokable',
              modifier: 'bind-invokable',
              helper: 'bind-invokable',
              ...additionalGlobalSpecialForms,
            },
            imports: {
              '@ember/helper': {
                array: 'array-literal',
                hash: 'object-literal',
                ...additionalSpecialForms.imports?.['@ember/helper'],
              },
              ...additionalSpecialForms.imports,
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
            'helper',
            'if',
            'in-element',
            'let',
            'log',
            'modifier',
            'mount',
            'mut',
            'outlet',
            'unbound',
            'unless',
            'with',
            'yield',
            ...Object.keys(additionalGlobalSpecialForms),
            ...additionalGlobals,
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
