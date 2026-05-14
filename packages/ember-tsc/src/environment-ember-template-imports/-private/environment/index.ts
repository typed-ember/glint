import { GlintEnvironmentConfig, GlintSpecialFormConfig } from '@glint/ember-tsc/config-types';
import { preprocess } from './preprocess.js';
import { transform } from './transform.js';

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

  const globalsForEmber = [
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
  ];

  /*
    Ember 7.1+ built-in keywords (RFCs 389, 470, 560, 561, 562, 997, 998, 999,
    1000). Their template-side signatures live in `KeywordsForEmber71` in
    `types/-private/dsl/globals.d.ts` and are gated on `ember-source >= 7.1.0`
    via the `HasEmber71BuiltIns` probe.
  */
  const globalsForEmber71 = [
    'and',
    'array',
    'element',
    'eq',
    'fn',
    'gt',
    'gte',
    'hash',
    'lt',
    'lte',
    'neq',
    'not',
    'on',
    'or',
  ];

  return {
    tags: {
      '@glint/ember-tsc/environment-ember-template-imports/-private/tag': {
        hbs: {
          typesModule: '@glint/ember-tsc/-private/dsl',
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
            ...globalsForEmber,
            ...globalsForEmber71,
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
