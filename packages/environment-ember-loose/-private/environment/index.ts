import { GlintEnvironmentConfig, PathCandidate } from '@glint/config/types';

const REGEXES = {
  JS_SCRIPT_EXT: /\.js$/,
  POD_COMPONENT: /\/component\.(ts|js)$/,
  POD_CONTROLLER: /\/controller\.(ts|js)$/,
  POD_ROUTE: /\/route\.(ts|js)$/,
  POD_TEMPLATE: /\/template\.hbs$/,
  SCRIPT_EXT: /\.(ts|js)$/,
  TEMPLATE_EXT: /\.hbs$/,
  TS_SCRIPT_EXT: /\.ts$/,
};

export default function emberLooseEnvironment(
  options: Record<string, unknown>
): GlintEnvironmentConfig {
  let typesModule = '@glint/environment-ember-loose/-private/dsl';
  if (options['allowPlainFunctionInvocation'] === false) {
    typesModule += '/without-function-resolution';
  }

  return {
    tags: {
      'ember-cli-htmlbars': {
        hbs: { typesModule },
      },
    },
    template: {
      typesModule,

      getPossibleScriptPaths(templatePath) {
        // Colocated script/template pair
        let colocatedTsScriptPath = templatePath.replace(REGEXES.TEMPLATE_EXT, '.ts');
        let candidates = [colocatedTsScriptPath];

        if (REGEXES.POD_TEMPLATE.test(templatePath)) {
          // Pod component/controller/route
          candidates.push(
            templatePath.replace(REGEXES.POD_TEMPLATE, '/component.ts'),
            templatePath.replace(REGEXES.POD_TEMPLATE, '/controller.ts'),
            templatePath.replace(REGEXES.POD_TEMPLATE, '/route.ts')
          );
        } else if (templatePath.includes('/templates/components/')) {
          // Classic component
          candidates.push(colocatedTsScriptPath.replace('/templates/components/', '/components/'));
        } else if (templatePath.includes('/templates/')) {
          // Classic controller/route
          candidates.push(
            colocatedTsScriptPath.replace('/templates/', '/controllers/'),
            colocatedTsScriptPath.replace('/templates/', '/routes/')
          );
        }

        return candidates.flatMap((candidate) => [
          candidate,
          candidate.replace(REGEXES.TS_SCRIPT_EXT, '.js'),
        ]);
      },

      getPossibleTemplatePaths(scriptPath) {
        // Colocated script/template pair
        let colocatedTemplatePath = scriptPath.replace(REGEXES.SCRIPT_EXT, '.hbs');
        let candidates: Array<PathCandidate> = [colocatedTemplatePath];

        if (REGEXES.POD_COMPONENT.test(scriptPath)) {
          // Pod component
          candidates.push(scriptPath.replace(REGEXES.POD_COMPONENT, '/template.hbs'));
        } else if (REGEXES.POD_ROUTE.test(scriptPath)) {
          // Pod route
          const podRouteTemplate = scriptPath.replace(REGEXES.POD_ROUTE, '/template.hbs');
          candidates.push({
            path: podRouteTemplate,
            deferTo: [
              scriptPath.replace(REGEXES.POD_ROUTE, '/controller.ts'),
              scriptPath.replace(REGEXES.POD_ROUTE, '/controller.js'),
            ],
          });
        } else if (REGEXES.POD_CONTROLLER.test(scriptPath)) {
          // Pod controller
          candidates.push(scriptPath.replace(REGEXES.POD_CONTROLLER, '/template.hbs'));
        } else if (scriptPath.includes('/routes/')) {
          // Classic route
          candidates.push({
            path: colocatedTemplatePath.replace('/routes/', '/templates/'),
            deferTo: [
              scriptPath.replace('/routes/', '/controllers/').replace(REGEXES.SCRIPT_EXT, '.ts'),
              scriptPath.replace('/routes/', '/controllers/').replace(REGEXES.SCRIPT_EXT, '.js'),
            ],
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
