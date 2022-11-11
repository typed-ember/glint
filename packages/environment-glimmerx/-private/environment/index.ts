import { GlintEnvironmentConfig, GlintTagConfig } from '@glint/core/config-types';

export default function glimmerxEnvironment(
  config: Record<string, unknown>
): GlintEnvironmentConfig {
  let additionalGlobals = Array.isArray(config['additionalGlobals'])
    ? config['additionalGlobals']
    : [];

  let tagConfig: GlintTagConfig = {
    typesModule: '@glint/environment-glimmerx/-private/dsl',
    specialForms: {
      globals: {
        if: 'if',
        unless: 'if-not',
        yield: 'yield',
      },
    },
    globals: [
      'component',
      'debugger',
      'each',
      'has-block',
      'has-block-params',
      'if',
      'in-element',
      'let',
      'unless',
      'with',
      'yield',
      ...additionalGlobals,
    ],
  };

  return {
    tags: {
      '@glimmerx/component': { hbs: tagConfig },
    },
  };
}
