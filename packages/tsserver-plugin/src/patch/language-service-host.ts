import { GlintConfig } from '@glint/config';
import {
  isTransformedPath,
  getOriginalPath,
  isTransformablePath,
  getTransformedPath,
} from '../util/path-transformation';

const hostConfigs = new WeakMap<ts.LanguageServiceHost, Set<GlintConfig>>();

/**
 * This patch updates module resolution logic on the language service host
 * to cause imports to resolve to the transformed version of a given module
 * rather than directly to the untransformed source.
 */
export function patchLanguageServiceHost(
  config: GlintConfig,
  { languageServiceHost }: ts.server.PluginCreateInfo
): void {
  let configs = hostConfigs.get(languageServiceHost);
  if (configs) {
    configs.add(config);
  } else {
    hostConfigs.set(languageServiceHost, new Set([config]));
    patchModuleResolution(languageServiceHost);
  }
}

function patchModuleResolution(languageServiceHost: ts.LanguageServiceHost): void {
  let { resolveModuleNames } = languageServiceHost;
  languageServiceHost.resolveModuleNames = (moduleNames, containingFile, ...params) => {
    let result =
      resolveModuleNames?.call(languageServiceHost, moduleNames, containingFile, ...params) ?? [];

    return result.map((resolved) => {
      if (resolved?.resolvedFileName === containingFile && isTransformedPath(containingFile)) {
        // If we're in a transformed file and resolving its import of
        // the original module, ensure that resolves to the actual module.
        resolved = {
          ...resolved,
          resolvedFileName: getOriginalPath(containingFile),
        };
      } else if (
        resolved &&
        isTransformablePath(resolved.resolvedFileName) &&
        isIncludedInConfig(languageServiceHost, resolved.resolvedFileName)
      ) {
        // Otherwise, point it to the transformed module, which will itself
        // depend on and re-export items from the original if necessary.
        let updated = getTransformedPath(resolved.resolvedFileName);
        if (updated !== containingFile) {
          resolved = { ...resolved, resolvedFileName: updated };
        }
      }

      return resolved;
    });
  };
}

function isIncludedInConfig(
  languageServiceHost: ts.LanguageServiceHost,
  fileName: string
): boolean {
  let configs = hostConfigs.get(languageServiceHost);
  if (!configs) return false;

  for (let config of configs) {
    if (config.includesFile(fileName)) {
      return true;
    }
  }

  return false;
}
