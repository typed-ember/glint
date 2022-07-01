import tsserverlibrary from 'typescript/lib/tsserverlibrary';
import path from 'path';

const factory: tsserverlibrary.server.PluginModuleFactory = ({ typescript: ts }) => {
  let configManager = new ConfigManager(ts);
  let silencedKeys: ServiceDefaults = {
    getQuickInfoAtPosition: undefined,
    getSemanticDiagnostics: [],
    getNavigationTree: undefined,
  };

  return {
    create(info) {
      // TODO: the syntax server always uses an implicit project, so we're never sure whether there's
      // Glint config or not

      if (info.project instanceof ts.server.ConfiguredProject) {
        let configPath = info.project.getConfigFilePath();
        return new Proxy(info.languageService, {
          get(target, property) {
            if (configManager.hasGlintConfig(configPath) && property in silencedKeys) {
              return () => silencedKeys[property as keyof typeof silencedKeys];
            }

            return target[property as keyof typeof target];
          },
        });
      }

      return info.languageService;
    },
  };
};

type ServiceDefaults = {
  [K in keyof tsserverlibrary.LanguageService]?: tsserverlibrary.LanguageService[K] extends (
    ...params: any
  ) => infer R
    ? R
    : never;
};

class ConfigManager {
  constructor(private ts: typeof tsserverlibrary) {}

  private knownConfigInfo = new Map<string, boolean>();
  private watchers = new Set<tsserverlibrary.FileWatcher>();

  hasGlintConfig(configPath: string): boolean {
    let hasConfig = this.knownConfigInfo.get(configPath);

    if (typeof hasConfig !== 'boolean') {
      let watcher = this.ts.sys.watchFile?.(configPath, () => {
        this.knownConfigInfo.clear();
        this.watchers.forEach((watcher) => watcher.close());
        this.watchers.clear();
      });

      if (watcher) {
        this.watchers.add(watcher);
      }

      let config = this.ts.readConfigFile(configPath, this.ts.sys.readFile).config;
      if (config.glint) {
        hasConfig = true;
      } else if (typeof config.extends === 'string') {
        hasConfig = this.hasGlintConfig(path.resolve(path.dirname(configPath), config.extends));
      }
    }

    this.knownConfigInfo.set(configPath, (hasConfig ??= false));

    return hasConfig;
  }
}

module.exports = factory;
