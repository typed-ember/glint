import type { TransformedModule } from '@glint/ember-tsc/lib/transform';
import type { ComponentMeta } from '@glint/ember-tsc/lib/plugins/g-component-hover';
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

    const cwd = info.languageServiceHost.getCurrentDirectory();

    const config = info.config ?? {};
    const emberTscSource = normalizeEmberTscSource((config as any).emberTscSource);
    const workspaceRoot =
      typeof (config as any).workspaceRoot === 'string' ? (config as any).workspaceRoot : cwd;
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

    const { findConfig, createDefaultConfig, createEmberLanguagePlugin } = emberTsc;
    const glintConfig = findConfig(cwd) ?? createDefaultConfig(ts, cwd);

    const gtsLanguagePlugin = createEmberLanguagePlugin(glintConfig, {
      clientId: 'tsserver-plugin',
    });
    return {
      languagePlugins: [gtsLanguagePlugin],
      setup: (language: any) => {
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
      },
    };

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

      session.addProtocolHandler('_glint:getComponentMeta', ({ arguments: args }) => {
        try {
          const meta = getComponentMetaForTag(ts, info.languageService, args.file, args.tagName);
          return { response: meta ?? undefined, responseRequired: true };
        } catch (e) {
          projectService.logger.info(
            `Glint: getComponentMeta error: ${e instanceof Error ? e.message : String(e)}`,
          );
          return { response: undefined, responseRequired: true };
        }
      });

      projectService.logger.info('Glint specific commands are successfully added.');
    }
  },
);

export = plugin;

function getComponentMetaForTag(
  ts: typeof import('typescript'),
  languageService: ts.LanguageService,
  fileName: string,
  tagName: string,
): ComponentMeta | null {
  const program = languageService.getProgram();
  if (!program) return null;

  const checker = program.getTypeChecker();

  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) return null;

  // Search the generated source for resolve(TagName) to find the component identifier.
  // indexOf finds only the first occurrence, but all invocations of the same component
  // resolve to the same symbol, so any match gives us the correct type information.
  // ts.getTokenAtPosition is not part of the public TS API but is used by Vue language-tools
  // and other TS plugin implementations for the same purpose.
  const resolvePattern = `resolve(${tagName})`;
  const resolveIdx = sourceFile.text.indexOf(resolvePattern);
  if (resolveIdx < 0) return null;

  const identifierPos = resolveIdx + 'resolve('.length;
  const node = (ts as any).getTokenAtPosition(sourceFile, identifierPos) as ts.Node | undefined;
  if (!node) return null;

  const symbol = checker.getSymbolAtLocation(node);
  if (!symbol) return null;

  return extractComponentMeta(ts, checker, symbol);
}

function extractComponentMeta(
  ts: typeof import('typescript'),
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
): ComponentMeta | null {
  // Resolve through import aliases to find the original declaration's JSDoc.
  let resolvedSymbol = symbol;
  while (resolvedSymbol.flags & ts.SymbolFlags.Alias) {
    resolvedSymbol = checker.getAliasedSymbol(resolvedSymbol);
  }
  const description = ts.displayPartsToString(resolvedSymbol.getDocumentationComment(checker));

  // Path 1: Class-backed component — e.g. `class Foo extends Component<Sig>`
  // The declared type's base class chain contains the Signature as a type argument.
  // We don't fall back to the class's own JSDoc (via `description`) because TypeScript's
  // own hover already shows it — Volar combines both hover results, so it would duplicate.
  // If the Signature *interface* has JSDoc, buildMeta picks it up via type.getSymbol().
  const declaredType = checker.getDeclaredTypeOfSymbol(symbol);
  const signatureType = findSignatureType(ts, checker, declaredType);
  if (signatureType) {
    return buildMeta(ts, checker, signatureType);
  }

  // Path 2: Template-only component — e.g. `<template>...</template> satisfies TOC<Sig>`
  // The value type is an intersection: TemplateOnlyComponent<never> & (abstract new () => ...)
  // with two construct signatures. The second returns InvokableInstance & HasContext<TemplateContext>.
  // We iterate in reverse because the first signature (from TemplateOnlyComponent<never>) is empty.
  //
  // Both class-backed and template-only components attach a [Context] symbol property
  // (via HasContext<ComponentContext<This, S>>) whose aliasTypeArguments contain the
  // original Signature type S. We extract S and run findSignatureType on it, which
  // avoids needing to know about TemplateContext's internal property names at all.
  const valueType = checker.getTypeOfSymbol(symbol);
  const constructSignatures = valueType.getConstructSignatures();

  for (let i = constructSignatures.length - 1; i >= 0; i--) {
    const instanceType = constructSignatures[i].getReturnType();

    // Some construct signatures may carry a Signature type directly
    const sig = findSignatureType(ts, checker, instanceType);
    if (sig) {
      const meta = buildMeta(ts, checker, sig);
      if (meta.args.length > 0 || meta.blocks.length > 0) {
        if (!meta.description) meta.description = description;
        return meta;
      }
    }

    // Walk [Context] symbol property (from HasContext<ComponentContext<This, S>>).
    // The unique symbol [Context] is mangled by TS to __@Context@NNN.
    // ComponentContext<This, S> is a type alias whose aliasTypeArguments give us
    // access to the original Signature S (with uppercase Args/Blocks/Element).
    for (const prop of instanceType.getProperties()) {
      if (prop.name.startsWith('__@Context@')) {
        const contextType = getPropertyType(checker, prop);
        if (!contextType) continue;

        // Try to extract the Signature from ComponentContext's alias type arguments.
        // ComponentContext<This, S> passes S as its second argument.
        const aliasArgs = (contextType as any).aliasTypeArguments as ts.Type[] | undefined;
        if (aliasArgs) {
          for (const arg of aliasArgs) {
            const argSig = findSignatureType(ts, checker, arg);
            if (argSig) {
              const meta = buildMeta(ts, checker, argSig);
              if (meta.args.length > 0 || meta.blocks.length > 0) {
                // Prefer JSDoc from the Signature interface itself (already in meta.description
                // via buildMeta's type symbol lookup). Fall back to the component's own JSDoc.
                if (!meta.description) meta.description = description;
                return meta;
              }
            }
          }
        }
      }
    }
  }

  return null;
}

function findSignatureType(
  ts: typeof import('typescript'),
  checker: ts.TypeChecker,
  type: ts.Type,
  visited: Set<ts.Type> = new Set(),
): ts.Type | null {
  if (visited.has(type)) return null;
  visited.add(type);

  // Check if this type itself has Args/Blocks/Element (it IS the signature)
  if (type.getProperty('Args') || type.getProperty('Blocks') || type.getProperty('Element')) {
    return type;
  }

  // Walk base types to find Component<Sig> and extract Sig
  const baseTypes = (type as ts.InterfaceType).getBaseTypes?.();
  if (baseTypes) {
    for (const base of baseTypes) {
      const typeArgs = getTypeArguments(checker, base);
      if (typeArgs) {
        for (const arg of typeArgs) {
          if (arg.getProperty('Args') || arg.getProperty('Blocks') || arg.getProperty('Element')) {
            return arg;
          }
        }
      }
      const nested = findSignatureType(ts, checker, base, visited);
      if (nested) return nested;
    }
  }

  return null;
}

function getTypeArguments(checker: ts.TypeChecker, type: ts.Type): readonly ts.Type[] | undefined {
  try {
    return checker.getTypeArguments(type as ts.TypeReference);
  } catch {
    return undefined;
  }
}

/**
 * Build component metadata by extracting Args, Blocks, and Element from a
 * Signature type (the user-facing `{ Args: ...; Blocks: ...; Element: ... }`).
 */
function buildMeta(
  ts: typeof import('typescript'),
  checker: ts.TypeChecker,
  type: ts.Type,
): ComponentMeta {
  const meta: ComponentMeta = { args: [], blocks: [], element: null, description: '' };

  // Try to get JSDoc from the type's own symbol (e.g. the Signature interface)
  const typeSymbol = type.getSymbol();
  if (typeSymbol) {
    const typeDoc = typeSymbol.getDocumentationComment(checker);
    if (typeDoc.length > 0) {
      meta.description = ts.displayPartsToString(typeDoc);
    }
  }

  // Extract args
  const argsProp = type.getProperty('Args');
  if (argsProp) {
    let argsType = getPropertyType(checker, argsProp);
    if (argsType) {
      // Handle the case where Args has Named/Positional sub-structure
      const namedProp = argsType.getProperty('Named');
      if (namedProp) {
        argsType = getPropertyType(checker, namedProp) || argsType;
      }

      for (const prop of argsType.getProperties()) {
        meta.args.push({
          name: prop.name,
          type: getPropertyTypeString(ts, checker, prop),
          description: ts.displayPartsToString(prop.getDocumentationComment(checker)),
          required: !(prop.flags & ts.SymbolFlags.Optional),
          tags:
            prop.getJsDocTags?.(checker)?.map((t: ts.JSDocTagInfo) => ({
              name: t.name,
              text: t.text?.map((p: ts.SymbolDisplayPart) => p.text).join(''),
            })) || [],
        });
      }
    }
  }

  // Extract blocks
  const blocksProp = type.getProperty('Blocks');
  if (blocksProp) {
    const blocksType = getPropertyType(checker, blocksProp);
    if (blocksType) {
      for (const prop of blocksType.getProperties()) {
        const propType = getPropertyType(checker, prop);
        meta.blocks.push({
          name: prop.name,
          params: propType ? checker.typeToString(propType) : '[]',
        });
      }
    }
  }

  // Extract element
  const elementProp = type.getProperty('Element');
  if (elementProp) {
    const elementType = getPropertyType(checker, elementProp);
    if (elementType) {
      const typeStr = checker.typeToString(elementType);
      if (typeStr !== 'void' && typeStr !== 'unknown') {
        meta.element = typeStr;
      }
    }
  }

  return meta;
}

/**
 * Get the type string for a property as written in source (preserving the
 * user's type annotation), rather than the resolved type which adds
 * `| undefined` to optional properties.
 */
function getPropertyTypeString(
  ts: typeof import('typescript'),
  checker: ts.TypeChecker,
  prop: ts.Symbol,
): string {
  const decl = prop.declarations?.[0];
  if (decl && ts.isPropertySignature(decl) && decl.type) {
    return decl.type.getText();
  }
  const propType = getPropertyType(checker, prop);
  return propType ? checker.typeToString(propType) : 'unknown';
}

function getPropertyType(checker: ts.TypeChecker, prop: ts.Symbol): ts.Type | undefined {
  const decl = prop.declarations?.[0];
  if (decl) {
    return checker.getTypeOfSymbolAtLocation(prop, decl);
  }
  // getTypeOfSymbol is a public TypeChecker API that works for synthetic types
  // without declarations (e.g. mapped/computed type properties)
  return checker.getTypeOfSymbol(prop);
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
