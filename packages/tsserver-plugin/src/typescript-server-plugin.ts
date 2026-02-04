import type { TransformedModule } from '@glint/ember-tsc/lib/transform';
import { createRequire } from 'node:module';
import * as path from 'node:path';

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
type EmberTscSource = 'auto' | 'workspace' | 'bundled';

let emberTsc: any;
let VirtualGtsCode: any;
let augmentDiagnostics: any;

function normalizeEmberTscSource(value: unknown): EmberTscSource {
  if (value === 'workspace' || value === 'bundled' || value === 'auto') {
    return value;
  }
  return 'auto';
}

function getBundledEmberTscPath(): string | undefined {
  try {
    // @ts-expect-error esbuild define
    return EMBER_TSC_PATH;
  } catch {
    return undefined;
  }
}

function loadEmberTscFromWorkspace(
  resolutionDir: string,
  logInfo: (message: string) => void,
): { module: any; resolvedPath: string } | null {
  try {
    const requireFrom = createRequire(path.join(resolutionDir, 'package.json'));
    const resolvedPath = requireFrom.resolve('@glint/ember-tsc');
    const workspaceJiti = createJiti(path.join(resolutionDir, 'package.json'));
    return { module: workspaceJiti(resolvedPath), resolvedPath };
  } catch (error) {
    logInfo(
      `Unable to resolve @glint/ember-tsc from ${resolutionDir}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

function loadEmberTscFromBundled(
  bundledPath: string | undefined,
  logInfo: (message: string) => void,
): { module: any; resolvedPath: string } | null {
  if (!bundledPath) {
    logInfo('Bundled ember-tsc path was not provided by the build.');
    return null;
  }

  try {
    return { module: jiti(bundledPath), resolvedPath: bundledPath };
  } catch (error) {
    logInfo(
      `Unable to load bundled ember-tsc at ${bundledPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

function loadEmberTscFromWorkspaceDirs(
  resolutionDirs: string[],
  logInfo: (message: string) => void,
): { module: any; resolvedPath: string } | null {
  for (const resolutionDir of resolutionDirs) {
    const resolved = loadEmberTscFromWorkspace(resolutionDir, logInfo);
    if (resolved) {
      return resolved;
    }
  }
  return null;
}

function getWorkspaceResolutionDirs(
  workspaceRoot: string,
  libraryPath: string,
  info: ts.server.PluginCreateInfo,
): string[] {
  const candidates: string[] = [path.resolve(workspaceRoot, libraryPath)];
  const project = info.project as unknown as {
    getProjectName?: () => string;
    getCurrentDirectory?: () => string;
  };
  const projectName = project.getProjectName?.();
  if (typeof projectName === 'string' && path.isAbsolute(projectName)) {
    const projectDir = projectName.endsWith('.json') ? path.dirname(projectName) : projectName;
    candidates.push(path.resolve(projectDir, libraryPath));
  }
  const projectDir = project.getCurrentDirectory?.();
  if (typeof projectDir === 'string' && path.isAbsolute(projectDir)) {
    candidates.push(path.resolve(projectDir, libraryPath));
  }
  return Array.from(new Set(candidates));
}

const plugin = createLanguageServicePlugin(
  (
    ts: typeof import('typescript'),
    info: ts.server.PluginCreateInfo,
  ): { languagePlugins: unknown[]; setup?: (language: any) => void } => {
    const logger = info.project.projectService.logger;
    const logInfo = (message: string): void => logger.info(`[Glint] ${message}`);
    const formatError = (error: unknown): string =>
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    const config = info.config ?? {};
    const emberTscSource = normalizeEmberTscSource((config as any).emberTscSource);
    const workspaceRoot =
      typeof (config as any).workspaceRoot === 'string'
        ? (config as any).workspaceRoot
        : info.languageServiceHost.getCurrentDirectory();
    const libraryPath =
      typeof (config as any).libraryPath === 'string' ? (config as any).libraryPath : '.';
    const resolutionDirs = getWorkspaceResolutionDirs(workspaceRoot, libraryPath, info);

    let resolved = null as { module: any; resolvedPath: string; source: EmberTscSource } | null;

    if (emberTscSource === 'bundled') {
      const bundled = loadEmberTscFromBundled(getBundledEmberTscPath(), logInfo);
      if (bundled) {
        resolved = { ...bundled, source: 'bundled' };
      } else {
        const workspace = loadEmberTscFromWorkspaceDirs(resolutionDirs, logInfo);
        if (workspace) {
          logInfo('Bundled ember-tsc unavailable; falling back to workspace package.');
          resolved = { ...workspace, source: 'workspace' };
        }
      }
    } else {
      const workspace = loadEmberTscFromWorkspaceDirs(resolutionDirs, logInfo);
      if (workspace) {
        resolved = { ...workspace, source: 'workspace' };
      } else {
        const bundled = loadEmberTscFromBundled(getBundledEmberTscPath(), logInfo);
        if (bundled) {
          logInfo('Workspace ember-tsc not found; falling back to bundled package.');
          resolved = { ...bundled, source: 'bundled' };
        }
      }
    }

    if (!resolved) {
      logInfo('Unable to load ember-tsc; Glint TS Plugin will not start.');
      return { languagePlugins: [] };
    }

    emberTsc = resolved.module;
    VirtualGtsCode = emberTsc.VirtualGtsCode;
    augmentDiagnostics = emberTsc.augmentDiagnostics;

    logInfo(`Using ${resolved.source} ember-tsc from ${resolved.resolvedPath}.`);

    const { findConfig, createEmberLanguagePlugin, createDynamicEmberLanguagePlugin } = emberTsc;

    try {
      const glintConfig = findConfigForProject(info, findConfig, logInfo);

      const compilerOptions = info.project.getCompilerOptions();
      if (compilerOptions.moduleResolution == null) {
        info.project.setCompilerOptions({
          ...compilerOptions,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          module: compilerOptions.module ?? ts.ModuleKind.ESNext,
        });
      }

      if (glintConfig) {
        let gtsLanguagePlugin: unknown;
        try {
          gtsLanguagePlugin = createEmberLanguagePlugin(glintConfig, {
            clientId: 'tsserver-plugin',
          });
        } catch (error) {
          logInfo(
            `Failed to create Ember language plugin from Glint config: ${formatError(error)}`,
          );
          throw error;
        }

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

            const resolveModuleNameLiterals =
              info.languageServiceHost.resolveModuleNameLiterals?.bind(info.languageServiceHost);

            if (resolveModuleNameLiterals) {
              // TS isn't aware of our custom .gts/.gjs extensions by default which causes
              // issues with resolving imports that omit extensions. We hackishly "teach"
              // TS about these extensions by overriding `resolveModuleNameLiterals` to
              // inject non-existent imports that cause TS to consider the extensions when
              // resolving.
              //
              // Origin of this hack:
              // https://github.com/typed-ember/glint/issues/806#issuecomment-2758616327
              info.languageServiceHost.resolveModuleNameLiterals = (
                moduleLiterals,
                containingFile,
                redirectedReference,
                options,
                ...rest
              ) => {
                let fakeImportNodes: any = [];
                if (moduleLiterals.length > 0) {
                  fakeImportNodes.push({
                    ...moduleLiterals[0],
                    text: './__NONEXISTENT_GLINT_HACK__.gts',
                  });
                  fakeImportNodes.push({
                    ...moduleLiterals[0],
                    text: './__NONEXISTENT_GLINT_HACK__.gjs',
                  });
                }

                const result = resolveModuleNameLiterals(
                  [...fakeImportNodes, ...moduleLiterals],
                  containingFile,
                  redirectedReference,
                  options,
                  ...rest,
                );

                return result.slice(fakeImportNodes.length);
              };
            }

            // Add Glint-specific protocol handlers for tsserver communication
            addGlintCommands();

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
        logInfo('Glint TS Plugin did not find a Glint config at init; using dynamic activation.');

        let gtsLanguagePlugin: unknown;
        try {
          gtsLanguagePlugin = createDynamicEmberLanguagePlugin(findConfig, {
            clientId: 'tsserver-plugin',
            getCurrentDirectory: () => info.languageServiceHost.getCurrentDirectory(),
          });
        } catch (error) {
          logInfo(`Failed to create dynamic Ember language plugin: ${formatError(error)}`);
          throw error;
        }

        return {
          languagePlugins: [gtsLanguagePlugin],
          setup: (language: any) => {
            info.languageService = proxyLanguageServiceForGlint(
              ts,
              language,
              info.languageService,
              (fileName) => fileName,
            );
          },
        };
      }
    } catch (error) {
      logInfo(`Glint TS Plugin failed to initialize: ${formatError(error)}`);
      throw error;
    }

    // https://github.com/JetBrains/intellij-plugins/blob/6435723ad88fa296b41144162ebe3b8513f4949b/Angular/src-js/angular-service/src/index.ts#L69
    function addGlintCommands(): void {
      const projectService = info.project.projectService;
      projectService.logger.info('Glint: called handler processing ' + info.project.projectKind);

      const session = info.session;
      if (session == undefined) {
        projectService.logger.info('Glint: there is no session in info.');
        return;
      }
      if (session.addProtocolHandler == undefined) {
        // addProtocolHandler was introduced in TS 4.4 or 4.5 in 2021, see https://github.com/microsoft/TypeScript/issues/43893
        projectService.logger.info('Glint: there is no addProtocolHandler method.');
        return;
      }
      if ((session as any).handlers.has('_glint:projectInfo')) {
        return;
      }

      // Map _glint: prefixed commands to their corresponding TypeScript server commands
      session.addProtocolHandler('_glint:projectInfo', ({ arguments: args }) => {
        return (session as any).handlers.get('projectInfo')?.({ arguments: args });
      });
      session.addProtocolHandler('_glint:documentHighlights-full', ({ arguments: args }) => {
        return (session as any).handlers.get('documentHighlights-full')?.({ arguments: args });
      });
      session.addProtocolHandler(
        '_glint:encodedSemanticClassifications-full',
        ({ arguments: args }) => {
          return (session as any).handlers.get('encodedSemanticClassifications-full')?.({
            arguments: args,
          });
        },
      );
      session.addProtocolHandler('_glint:quickinfo', ({ arguments: args }) => {
        return (session as any).handlers.get('quickinfo')?.({ arguments: args });
      });

      projectService.logger.info('Glint specific commands are successfully added.');
    }
  },
);

export = plugin;

function findConfigForProject(
  info: ts.server.PluginCreateInfo,
  findConfig: (from: string) => any,
  log?: (message: string) => void,
): any {
  const candidateDirs: string[] = [];
  const projectCurrentDirectory =
    typeof (info.project as any).getCurrentDirectory === 'function'
      ? (info.project as any).getCurrentDirectory()
      : undefined;

  if (projectCurrentDirectory) {
    candidateDirs.push(projectCurrentDirectory);
  }

  candidateDirs.push(info.languageServiceHost.getCurrentDirectory());

  const scriptFileNames = info.project.getScriptFileNames();
  const gtsLikeFiles = scriptFileNames.filter(
    (fileName) => fileName.endsWith('.gts') || fileName.endsWith('.gjs'),
  );
  for (const fileName of gtsLikeFiles) {
    if (fileName.endsWith('.gts') || fileName.endsWith('.gjs')) {
      candidateDirs.push(path.dirname(fileName));
    }
  }

  for (const fileName of scriptFileNames) {
    candidateDirs.push(path.dirname(fileName));
  }

  const checkedDirs = new Set<string>();
  for (const dir of candidateDirs) {
    if (checkedDirs.has(dir)) {
      continue;
    }
    checkedDirs.add(dir);

    const config = findConfig(dir);
    if (config) {
      return config;
    }
  }

  if (log) {
    const checkedList = Array.from(checkedDirs);
    const shownDirs = checkedList.slice(0, 8);
    const suffix =
      checkedList.length > shownDirs.length
        ? ` (showing ${shownDirs.length} of ${checkedList.length})`
        : '';
    log(
      `Glint TS Plugin did not find a Glint config. ` +
        `Checked ${checkedList.length} directories${suffix}. ` +
        `Found ${gtsLikeFiles.length} .gts/.gjs files in the project. ` +
        `Directories: ${shownDirs.join(', ') || '(none)'}`,
    );
  }

  return null;
}

function proxyLanguageServiceForGlint<T>(
  ts: typeof import('typescript'),
  language: any, // Language<T>,
  languageService: ts.LanguageService,
  asScriptId: (fileName: string) => T,
): ts.LanguageService {
  // eslint-lint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const proxyCache = new Map<string | symbol, Function | undefined>();
  // eslint-lint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const getProxyMethod = (target: ts.LanguageService, p: string | symbol): Function | undefined => {
    switch (p) {
      case 'getCompletionsAtPosition':
        return getCompletionsAtPosition(ts, language, languageService, asScriptId, target[p]);
      // case 'getCompletionEntryDetails': return getCompletionEntryDetails(language, asScriptId, target[p]);
      // case 'getCodeFixesAtPosition': return getCodeFixesAtPosition(target[p]);
      // case 'getDefinitionAndBoundSpan': return getDefinitionAndBoundSpan(ts, language, languageService, glintOptions, asScriptId, target[p]);
      // case 'getQuickInfoAtPosition': return getQuickInfoAtPosition(ts, target, target[p]);
      // TS plugin only

      // Left as an example in case we want to augment semantic classification in .gts files.
      // e.g. Vue does this to semantically classify Component names as `class` tokens.
      // case 'getEncodedSemanticClassifications':
      //   return getEncodedSemanticClassifications(ts, language, target, asScriptId, target[p]);

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

function getCompletionsAtPosition<T>(
  ts: typeof import('typescript'),
  language: any, // Language<T>,
  languageService: ts.LanguageService,
  asScriptId: (fileName: string) => T,
  getCompletionsAtPosition: ts.LanguageService['getCompletionsAtPosition'],
): ts.LanguageService['getCompletionsAtPosition'] {
  return (fileName, position, options, formattingSettings) => {
    try {
      const sourceScript = language.scripts.get(asScriptId(fileName));
      const root = sourceScript?.generated?.root;
      const transformedModule: TransformedModule = root?.transformedModule;
      const completions = getCompletionsAtPosition(fileName, position, options, formattingSettings);
      const transformedRange = transformedModule?.getTransformedRange(
        transformedModule.originalFileName,
        position,
        position,
      );
      if (completions && transformedRange) {
        // for attribute names on elements, we do not want the wrapping `"`.
        if (transformedRange.mapping?.parent?.sourceNode.type === 'ElementNode') {
          completions.entries = completions.entries.map((e) => ({
            ...e,
            name: e.name.replace(/^"/, '').replace(/"$/, ''),
            sortText: e.sortText.replace(/\\"/g, ''),
          }));
        }
      }

      console.log(completions);
      return completions!;
    } catch (e) {
      console.log('error', (e as any)?.message);
      console.log(e);
      throw e;
    }
  };
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

    if (!VirtualGtsCode || !augmentDiagnostics) {
      return tsDiagnostics;
    }

    const program = languageService.getProgram()!;
    const sourceScript = language.scripts.get(asScriptId(fileName));
    if (!sourceScript?.generated) {
      return tsDiagnostics;
    }

    const root = sourceScript.generated.root;
    if (!(root instanceof VirtualGtsCode)) {
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

const windowsPathReg = /\\/g;

/**
 * Return semantic tokens for semantic highlighting:
 * https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide
function getEncodedSemanticClassifications<T>(
  ts: typeof import('typescript'),
  language: any, // Language<T>,
  languageService: ts.LanguageService,
  asScriptId: (fileName: string) => T,
  getEncodedSemanticClassifications: ts.LanguageService['getEncodedSemanticClassifications'],
): ts.LanguageService['getEncodedSemanticClassifications'] {
  return (filePath, span, format) => {
    const fileName = filePath.replace(windowsPathReg, '/');
    const result = getEncodedSemanticClassifications(fileName, span, format);
    const sourceScript = language.scripts.get(asScriptId(fileName));
    const root = sourceScript?.generated?.root;
    if (root instanceof VirtualGtsCode) {
      // This would remove all semantic highlighting from .gts files, including the TS parts
      // outside of the `<template>` tags, which is probably undesirable.
      // result.spans = [];

      // We can push span to the end of the array to override previous entries.
      // result.spans.push(
      //   0,
      //   100,
      //   256, // class
      // );
    }
    return result;
  };
}
 */
