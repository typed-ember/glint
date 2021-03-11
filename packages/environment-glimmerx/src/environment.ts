import { GlintEnvironmentConfig } from '@glint/config';

export default function glimmerxEnvironment(): GlintEnvironmentConfig {
  return {
    tags: {
      '@glimmerx/component': {
        hbs: {
          typesSource: '@glint/environment-glimmerx/types',
        },
      },
      '@glint/environment-glimmerx': {
        hbs: {
          typesSource: '@glint/environment-glimmerx/types',
        },
      },
    },
  };
}
