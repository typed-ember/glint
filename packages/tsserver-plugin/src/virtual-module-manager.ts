import type ts from 'typescript/lib/tsserverlibrary';
import { TransformedModule, rewriteModule } from '@glint/transform';
import { isTransformedPath, getOriginalPath, TransformablePath } from './util/path-transformation';
import { GlintConfig } from '@glint/config';

type ConfiguredProject = {
  project: ts.server.Project;
  config: GlintConfig;
};

export default class VirtualModuleManager {
  private configuredProjects: Array<ConfiguredProject> = [];
  private transformedModules = new Map<ts.server.ScriptInfo, TransformedModule>();
  private sysReadFile: (path: string, encoding?: string) => string | undefined;

  public constructor(ts: typeof import('typescript/lib/tsserverlibrary')) {
    this.sysReadFile = ts.sys.readFile;
  }

  public addProject(config: GlintConfig, project: ts.server.Project): void {
    this.configuredProjects.push({ project, config });
  }

  public isTransformationCandidate(path: string): boolean {
    return Boolean(this.findConfiguredProject(path));
  }

  public getTransformedModule(path: TransformablePath): TransformedModule | undefined {
    let scriptInfo = this.findConfiguredProject(path)?.project.getScriptInfo(path);
    return scriptInfo && this.transformedModules.get(scriptInfo);
  }

  public readFile(path: string, encoding?: string): string | undefined {
    if (!isTransformedPath(path)) {
      return this.sysReadFile(path, encoding);
    }

    let configuredProject = this.findConfiguredProject(path);
    if (!configuredProject) {
      return;
    }

    let originalPath = getOriginalPath(path);
    let originalScriptInfo = configuredProject.project.getScriptInfo(originalPath);
    let glintEnvironment = configuredProject.config.environment;
    let snapshot = originalScriptInfo?.getSnapshot();
    let length = snapshot?.getLength() ?? 0;
    let contents = snapshot?.getText(0, length) ?? this.sysReadFile(originalPath, encoding);

    if (!contents || !glintEnvironment.moduleMayHaveTagImports(contents)) {
      return contents;
    }

    let script = { filename: originalPath, contents };
    let transformedModule = rewriteModule({ script }, glintEnvironment);
    if (transformedModule && originalScriptInfo) {
      this.transformedModules.set(originalScriptInfo, transformedModule);
      return transformedModule.transformedContents;
    }

    if (originalScriptInfo) {
      this.transformedModules.delete(originalScriptInfo);
    }

    return '';
  }

  private findConfiguredProject(fileName: string): ConfiguredProject | null {
    for (let project of this.configuredProjects) {
      if (project.config.includesFile(fileName)) {
        return project;
      }
    }

    return null;
  }
}
