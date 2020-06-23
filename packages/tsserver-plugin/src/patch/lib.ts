import type tslib from 'typescript/lib/tsserverlibrary';
import VirtualModuleManager from '../virtual-module-manager';
import {
  isTransformablePath,
  getTransformedPath,
  isTransformedPath,
  getOriginalPath,
} from '../path-transformation';

/**
 * This module houses our deepest sins. Here we directly patch certain
 * functions and class methods from `tsserverlibrary` in order to ensure
 * we can properly manage two parallel versions of the world: one with
 * the actual source text as provided by the editor, and one with the
 * version we wish to present diagnostics for.
 */
export function patchLib(ts: typeof tslib, modules: VirtualModuleManager): void {
  patchFSOperations(ts, modules);
  patchSourceFileCreation(ts);
  patchScriptInfo(ts);
}

function patchFSOperations(ts: typeof tslib, modules: VirtualModuleManager): void {
  const { fileExists, watchFile } = ts.sys;

  // Reroute existence checks for transformed modules back to their source
  ts.sys.fileExists = (file) => {
    if (isTransformedPath(file)) {
      file = getOriginalPath(file);
    }

    return fileExists(file);
  };

  // Route file reading through the virtual module manager in order to
  // present the transformed version of modules with templates in them,
  // when appropriate.
  ts.sys.readFile = (file, encoding) => {
    return modules.readFile(file, encoding);
  };

  // Treat watch calls on virtual (transformed) modules as no-ops
  ts.sys.watchFile = (file, callback, pollingInterval, options) => {
    if (isTransformedPath(file) || !watchFile) {
      return { close: () => {} };
    }

    return watchFile(file, callback, pollingInterval, options);
  };
}

// Ensure after creation and update that any source file implicitly
// references its transformed version, if appropriate, so that the
// transformed version will be included in typechecking and can generate
// approprate diagnostics even if it's never explicitly imported.
function patchSourceFileCreation(ts: typeof tslib): void {
  const { createSourceFile, updateSourceFile } = ts;

  ts.createSourceFile = (fileName, ...params) => {
    let sourceFile = createSourceFile.call(ts, fileName, ...params);
    addReferenceToTransformedFile(sourceFile);
    return sourceFile;
  };

  ts.updateSourceFile = (sourceFile, ...params) => {
    let updated = updateSourceFile(sourceFile, ...params);
    addReferenceToTransformedFile(updated);
    return updated;
  };

  function addReferenceToTransformedFile(sourceFile: ts.SourceFile): void {
    let referencedFiles = sourceFile.referencedFiles.slice();

    if (isTransformablePath(sourceFile.fileName)) {
      referencedFiles.push({
        fileName: getTransformedPath(sourceFile.fileName),
        pos: sourceFile.text.length,
        end: sourceFile.text.length,
      });
    }

    sourceFile.referencedFiles = referencedFiles;
  }
}

// Ensure that any update to a module, either on disk or in-memory in
// the editor, also triggers an update to its transformed counterpart.
function patchScriptInfo(ts: typeof tslib): void {
  const { ScriptInfo } = ts.server;
  const { registerFileUpdate, editContent } = ScriptInfo.prototype;

  ScriptInfo.prototype.registerFileUpdate = function () {
    registerFileUpdate.call(this);

    findTransformedScriptInfo(this)?.registerFileUpdate();
  };

  ScriptInfo.prototype.editContent = function (start, end, newText) {
    editContent.call(this, start, end, newText);

    let transformedInfo = findTransformedScriptInfo(this);
    transformedInfo?.registerFileUpdate();
    transformedInfo?.reloadFromFile();
  };

  function findTransformedScriptInfo(
    original: ts.server.ScriptInfo
  ): ts.server.ScriptInfo | undefined {
    let { fileName } = original;
    if (!isTransformablePath(fileName)) return;

    let transformedFileName = getTransformedPath(fileName);
    for (let project of original.containingProjects) {
      let info = project.getScriptInfo(transformedFileName);
      if (info) {
        return info;
      }
    }
  }
}
