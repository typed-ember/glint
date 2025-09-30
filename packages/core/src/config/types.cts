import type ts from 'typescript';

// This file is explicitly `.cts` so that environment packages written
// in CJS can import its types from `@glint/ember-tsc/config-types`.

type TSLib = typeof ts;

export type GlintConfigInput = {
  environment: string | Array<string> | Record<string, unknown>;
};

export type GlintEnvironmentConfig = {
  tags?: GlintTagsConfig;
  extensions?: GlintExtensionsConfig;
};

export type GlintExtensionPreprocess<T> = (
  source: string,
  filePath: string,
) => { contents: string; data?: T };

export type GlintEmitMetadata = {
  prepend?: string;
  append?: string;
  templateLocation?: {
    start: number;
    end: number;
    contentStart: number;
    contentEnd: number;
  };
};

export type GlintExtensionTransform<T> = (
  data: T,
  state: {
    ts: TSLib;
    context: ts.TransformationContext;
    setEmitMetadata: (node: ts.TaggedTemplateExpression, meta: GlintEmitMetadata) => void;
  },
) => ts.Transformer<ts.Node>;

export type GlintSpecialForm =
  | 'if'
  | 'if-not'
  | 'yield'
  | 'object-literal'
  | 'array-literal'
  | 'bind-invokable'
  | '==='
  | '!=='
  | '&&'
  | '||'
  | '!';

export type GlintSpecialFormConfig = {
  globals?: { [global: string]: GlintSpecialForm };
  imports?: {
    [path: string]: {
      [identifier: string]: GlintSpecialForm;
    };
  };
};

export type SourceKind = 'typed-script' | 'untyped-script';
export type GlintExtensionConfig<PreprocessData = any> = {
  kind: SourceKind;
  preprocess?: GlintExtensionPreprocess<PreprocessData>;
  transform?: GlintExtensionTransform<PreprocessData>;
};

export type GlintExtensionsConfig = {
  [extension: string]: GlintExtensionConfig;
};

export type GlintTagConfig = {
  typesModule: string;
  globals?: Array<string>;
  specialForms?: GlintSpecialFormConfig;
};

export type GlintTagsConfig = {
  [importSource: string]: {
    [importSpecifier: string]: GlintTagConfig;
  };
};
