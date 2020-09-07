import type ts from 'typescript/lib/tsserverlibrary';
import path from 'path';
import { loadConfig } from '@glint/config';
import VirtualModuleManager from './virtual-module-manager';
import { patchLib } from './patch-lib';
import { loggerFor, Logger } from './util/logging';
import GlintLanguageService from './language-service';

const init: ts.server.PluginModuleFactory = ({ typescript: ts }) => {
  const modules = new VirtualModuleManager(ts);

  patchLib(ts, modules);

  return {
    create(info) {
      let logger = loggerFor(info);
      let config = loadConfig(path.dirname(info.project.projectName));

      logger.log('\nStarting @glint/tsserver-plugin at', new Date().toString());

      modules.addProject(config, info.project);

      let glintService = new GlintLanguageService(ts, modules, info);
      let fullService = makeProxy(info.languageService, glintService);

      if (info.config.logLanguageServiceMethodCalls) {
        installMethodLogging(logger, fullService);
      }

      return fullService;
    },
  };
};

export = init;

function makeProxy(base: ts.LanguageService, glint: GlintLanguageService): ts.LanguageService {
  return new Proxy(base, {
    get(_, key: keyof GlintLanguageService) {
      if (key in glint) {
        return glint[key];
      }

      return base[key];
    },

    set(_, key: keyof GlintLanguageService, value) {
      glint[key] = value;
      return true;
    },
  });
}

function installMethodLogging(logger: Logger, service: ts.LanguageService): void {
  for (let _key in service) {
    let key = _key as keyof ts.LanguageService;
    let f: any = service[key];
    if (typeof f === 'function') {
      service[key] = ((...params: any) => {
        logger.log(key, params[0]);
        return f.apply(service, params);
      }) as any;
    }
  }
}
