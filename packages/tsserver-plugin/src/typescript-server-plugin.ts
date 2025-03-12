const { createJiti } = require('jiti');
const jiti = createJiti(__filename);

import type * as ts from 'typescript';

const {
  createLanguageServicePlugin,
} = require('@volar/typescript/lib/quickstart/createLanguageServicePlugin.js');

/**
 * We use the jiti (https://github.com/unjs/jiti) runtime to make it possible to
 * synchronously load the ESM glint libraries from the current CommonJS context.
 * It is a requirement that TypeScript plugins are written in CommonJS, which poses issues
 * with having Glint be authored in ESM due to the requirement that typically `await import`
 * is required to load ESM modules from CJS. But with jiti we can synchronously load the ESM
 * modules from CJS which lets us avoid a ton of hacks and complexity we (or Volar)
 * would otherwise have to write to bridge the sync/async APIs.
 */
const glintCore = jiti('@glint/core');

const { VirtualGtsCode, LooseModeBackingComponentClassVirtualCode, augmentDiagnostics } = glintCore;

const plugin = createLanguageServicePlugin(
  (ts: typeof import('typescript'), info: ts.server.PluginCreateInfo) => {
    const { findConfig, createEmberLanguagePlugin } = glintCore;

    const cwd = info.languageServiceHost.getCurrentDirectory();
    const glintConfig = findConfig(cwd);

    // Uncomment as a smoke test to see if the plugin is running
    const enableLogging = false;

    if (glintConfig) {
      if (enableLogging) {
        info.project.projectService.logger.info('Glint TS Plugin is running!');
      }

      const gtsLanguagePlugin = createEmberLanguagePlugin(glintConfig);
      return {
        languagePlugins: [gtsLanguagePlugin],
        setup: (language: any) => {
          // project2Service.set(info.project, [
          //   language,
          //   info.languageServiceHost,
          //   info.languageService,
          // ]);

          info.languageService = proxyLanguageServiceForGlint(
            ts,
            language,
            info.languageService,
            (fileName) => fileName,
          );

          // #3963
          // const timer = setInterval(() => {
          //   if (info.project['program']) {
          //     clearInterval(timer);
          //     info.project['program'].__glint__ = { language };
          //   }
          // }, 50);
        },
      };
    } else {
      if (enableLogging) {
        info.project.projectService.logger.info('Glint TS Plugin is NOT running!');
      }

      return {
        languagePlugins: [],
      };
    }
  },
);

export = plugin;

function proxyLanguageServiceForGlint<T>(
  ts: typeof import('typescript'),
  language: any, // Language<T>,
  languageService: ts.LanguageService,
  asScriptId: (fileName: string) => T,
): ts.LanguageService {
  const proxyCache = new Map<string | symbol, Function | undefined>();
  const getProxyMethod = (target: ts.LanguageService, p: string | symbol): Function | undefined => {
    switch (p) {
      // case 'getCompletionsAtPosition': return getCompletionsAtPosition(glintOptions, target[p]);
      // case 'getCompletionEntryDetails': return getCompletionEntryDetails(language, asScriptId, target[p]);
      // case 'getCodeFixesAtPosition': return getCodeFixesAtPosition(target[p]);
      // case 'getDefinitionAndBoundSpan': return getDefinitionAndBoundSpan(ts, language, languageService, glintOptions, asScriptId, target[p]);
      // case 'getQuickInfoAtPosition': return getQuickInfoAtPosition(ts, target, target[p]);
      // TS plugin only
      // case 'getEncodedSemanticClassifications': return getEncodedSemanticClassifications(ts, language, target, asScriptId, target[p]);

      case 'getSemanticDiagnostics':
        return getSemanticDiagnostics(ts, language, languageService, asScriptId, target[p]);
    }
  };

  return new Proxy(languageService, {
    get(target, p, receiver) {
      if (getProxyMethod) {
        if (!proxyCache.has(p)) {
          proxyCache.set(p, getProxyMethod(target, p));
        }
        const proxyMethod = proxyCache.get(p);
        if (proxyMethod) {
          return proxyMethod;
        }
      }
      return Reflect.get(target, p, receiver);
    },
    set(target, p, value, receiver) {
      return Reflect.set(target, p, value, receiver);
    },
  });
}

function getSemanticDiagnostics<T>(
  ts: typeof import('typescript'),
  language: any, // Language<T>,
  languageService: ts.LanguageService,
  asScriptId: (fileName: string) => T,
  getSemanticDiagnostics: ts.LanguageService['getSemanticDiagnostics'],
): ts.LanguageService['getSemanticDiagnostics'] {
  return (fileName) => {
    const tsDiagnostics = getSemanticDiagnostics(fileName);

    const program = languageService.getProgram()!;
    const sourceScript = language.scripts.get(asScriptId(fileName));
    if (!sourceScript?.generated) {
      return tsDiagnostics;
    }

    const root = sourceScript.generated.root;
    if (
      !(root instanceof VirtualGtsCode || root instanceof LooseModeBackingComponentClassVirtualCode)
    ) {
      return tsDiagnostics;
    }

    const transformedModule = root.transformedModule;
    if (!transformedModule) {
      return tsDiagnostics;
    }

    const sourceFile = program.getSourceFile(fileName);
    if (!sourceFile) {
      return tsDiagnostics;
    }

    const augmentedTsDiagnostics = augmentDiagnostics(transformedModule, tsDiagnostics);

    return augmentedTsDiagnostics;
  };
}
