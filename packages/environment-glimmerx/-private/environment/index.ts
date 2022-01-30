import { GlintEnvironmentConfig, GlintTagConfig } from '@glint/config';

export default function glimmerxEnvironment(
  config: Record<string, unknown>
): GlintEnvironmentConfig {
  let additionalGlobals = Array.isArray(config['additionalGlobals'])
    ? config['additionalGlobals']
    : [];

  let tagConfig: GlintTagConfig = {
    typesSource: '@glint/environment-glimmerx/-private/dsl',
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
      '@glint/environment-glimmerx/component': { hbs: tagConfig },
    },
  };
}
