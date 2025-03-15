declare module '@glint/core/config-types' {
  export interface GlintEnvironmentConfig {
    name: string;
    specialForms?: GlintSpecialFormConfig[];
    preprocess?: GlintExtensionPreprocess<any>;
    transform?: GlintExtensionTransform<any>;
  }

  export interface GlintSpecialFormConfig {
    name: string;
    importPath: string;
    exportName: string;
  }

  export interface GlintExtensionPreprocess<T> {
    (source: string, path: string): T;
  }

  export interface GlintExtensionTransform<T> {
    (data: T, options: { ts: any; context: any; setEmitMetadata: any }): (sf: any) => any;
  }

  export interface GlintConfigInput {
    environment: string | GlintEnvironmentConfig;
    checkStandaloneTemplates?: boolean;
  }
}

declare module '@glint/core' {
  export const pathUtils: any;
}
