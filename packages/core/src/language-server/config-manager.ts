import ts from 'typescript';

export type TsUserConfigLang = 'typescript' | 'javascript';

// The ConfigManager holds TypeScript/JS formating and user preferences.
// It is only needed for the vscode binding
export class ConfigManager {
  private formatCodeOptions: Record<TsUserConfigLang, ts.FormatCodeSettings> = {
    javascript: ts.getDefaultFormatCodeSettings(),
    typescript: ts.getDefaultFormatCodeSettings(),
  };

  private userPreferences: Record<TsUserConfigLang, ts.UserPreferences> = {
    typescript: {},
    javascript: {},
  };

  public updateTsJsFormatConfig(lang: TsUserConfigLang, config: ts.FormatCodeSettings): void {
    this.formatCodeOptions[lang] = {
      ...this.formatCodeOptions[lang],
      ...config,
    };
  }

  public updateTsJsUserPreferences(lang: TsUserConfigLang, config: ts.UserPreferences): void {
    this.userPreferences[lang] = {
      ...this.userPreferences[lang],
      ...config,
    };
  }

  public getUserSettingsFor(lang: TsUserConfigLang): ts.UserPreferences {
    return this.userPreferences[lang];
  }

  public getFormatCodeSettingsFor(lang: TsUserConfigLang): ts.FormatCodeSettings {
    return this.formatCodeOptions[lang];
  }
}
