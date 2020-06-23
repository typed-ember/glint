import {
  isTransformedPath,
  getOriginalPath,
  isTransformablePath,
  getTransformedPath,
} from '../path-transformation';

/**
 * This patch updates module resolution logic on the language service host
 * to cause imports to resolve to the transformed version of a given module
 * rather than directly to the untransformed source.
 */
export function patchLanguageServiceHost({
  languageServiceHost,
}: ts.server.PluginCreateInfo): void {
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
        !resolved.isExternalLibraryImport &&
        isTransformablePath(resolved.resolvedFileName)
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
