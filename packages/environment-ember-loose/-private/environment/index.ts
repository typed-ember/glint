import { GlintEnvironmentConfig } from '@glint/config';

export default function glimmerxEnvironment(): GlintEnvironmentConfig {
  return {
    template: {
      typesPath: '@glint/environment-ember-loose/-private/dsl',

      getPossibleScriptPaths(templatePath) {
        if (/[\\/]template\.hbs$/.test(templatePath)) {
          // Pod component
          return [templatePath.replace(/template\.hbs$/, 'component.ts')];
        } else {
          // Colocated component
          return [templatePath.replace(/\.hbs$/, '.ts')];
        }
      },

      getPossibleTemplatePaths(scriptPath) {
        if (/[\\/]component\.ts$/.test(scriptPath)) {
          // Pod component
          return [scriptPath.replace(/component\.ts$/, 'template.hbs')];
        } else {
          // Colocated component
          return [scriptPath.replace(/\.ts$/, '.hbs')];
        }
      },
    },
  };
}
