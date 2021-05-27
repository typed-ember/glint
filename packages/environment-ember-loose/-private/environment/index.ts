import { GlintEnvironmentConfig, PathCandidate } from '@glint/config';

export default function glimmerxEnvironment(): GlintEnvironmentConfig {
  return {
    template: {
      typesPath: '@glint/environment-ember-loose/-private/dsl',

      getPossibleScriptPaths(templatePath) {
        // Colocated script/template pair
        let colocatedScriptPath = templatePath.replace(/\.hbs$/, '.ts');
        let candidates = [colocatedScriptPath];

        if (templatePath.endsWith('/template.hbs')) {
          // Pod component/controller/route
          candidates.push(
            templatePath.replace(/template\.hbs$/, 'component.ts'),
            templatePath.replace(/template\.hbs$/, 'controller.ts'),
            templatePath.replace(/template\.hbs$/, 'route.ts')
          );
        } else if (templatePath.includes('/templates/components/')) {
          // Classic component
          candidates.push(colocatedScriptPath.replace('/templates/components/', '/components/'));
        } else if (templatePath.includes('/templates/')) {
          // Classic controller/route
          candidates.push(
            colocatedScriptPath.replace('/templates/', '/controllers/'),
            colocatedScriptPath.replace('/templates/', '/routes/')
          );
        }

        return candidates;
      },

      getPossibleTemplatePaths(scriptPath) {
        // Colocated script/template pair
        let colocatedTemplatePath = scriptPath.replace(/\.ts$/, '.hbs');
        let candidates: Array<PathCandidate> = [colocatedTemplatePath];

        if (scriptPath.endsWith('/component.ts')) {
          // Pod component
          candidates.push(scriptPath.replace(/component\.ts$/, 'template.hbs'));
        } else if (scriptPath.endsWith('/route.ts')) {
          // Pod route
          candidates.push({
            path: scriptPath.replace(/route\.ts$/, 'template.hbs'),
            deferTo: [scriptPath.replace(/route\.ts$/, 'controller.ts')],
          });
        } else if (scriptPath.endsWith('/controller.ts')) {
          // Pod controller
          candidates.push(scriptPath.replace(/controller\.ts$/, 'template.hbs'));
        } else if (scriptPath.includes('/routes/')) {
          // Classic route
          candidates.push({
            path: colocatedTemplatePath.replace('/routes/', '/templates/'),
            deferTo: [scriptPath.replace('/routes/', '/controllers/')],
          });
        } else if (scriptPath.includes('/controllers/')) {
          // Classic controller
          candidates.push(colocatedTemplatePath.replace('/controllers/', '/templates/'));
        } else if (colocatedTemplatePath.includes('/components/')) {
          // Classic layout component
          candidates.push(colocatedTemplatePath.replace('/components/', '/templates/components/'));
        }

        return candidates;
      },
    },
  };
}
