import { GlintEnvironment } from '@glint/ember-tsc/config/index';
import { describe, expect, test } from 'vitest';

function buildConfig(configObject: any): any {
  const env = GlintEnvironment.load(configObject) as any;
  return env.tagConfig['@glint/ember-tsc/environment-ember-template-imports/-private/tag'].hbs;
}

describe('tsconfig.glint config object', () => {
  test('various v2 top level configurations and legacy nested v1 configurations are supported', () => {
    const truthHelpersAdditionalSpecialForms = {
      imports: {
        'ember-truth-helpers': {
          eq: '===',
        },
        'ember-truth-helpers/helpers/eq': { default: '===' },
      },
    };

    expect(buildConfig(null).globals).toContain('yield');
    expect(buildConfig({}).globals).toContain('yield');
    expect(buildConfig({ additionalGlobals: ['hello'] }).globals).toContain('hello');

    expect(
      buildConfig({ additionalSpecialForms: truthHelpersAdditionalSpecialForms }).globals,
    ).toContain('yield');
    expect(
      buildConfig({ additionalSpecialForms: truthHelpersAdditionalSpecialForms }).specialForms
        .imports['ember-truth-helpers'].eq,
    ).toEqual('===');

    const combinedConfig = buildConfig({
      additionalGlobals: ['hello'],
      additionalSpecialForms: truthHelpersAdditionalSpecialForms,
    });
    expect(combinedConfig.globals).toContain('hello');
    expect(combinedConfig.specialForms.imports['ember-truth-helpers'].eq).toEqual('===');

    expect(
      buildConfig({
        environment: {
          'ember-template-imports': {
            additionalGlobals: ['hello'],
          },
        },
      }).globals,
    ).toContain('hello');
    expect(
      buildConfig({
        environment: {
          'ember-template-imports': {
            additionalSpecialForms: truthHelpersAdditionalSpecialForms,
          },
        },
      }).specialForms.imports['ember-truth-helpers'].eq,
    ).toEqual('===');
    expect(
      buildConfig({
        environment: {
          'ember-template-imports': {
            additionalGlobals: ['hello'],
            additionalSpecialForms: truthHelpersAdditionalSpecialForms,
          },
        },
      }).globals,
    ).toContain('hello');
    expect(
      buildConfig({
        environment: {
          'ember-template-imports': {
            additionalGlobals: ['hello'],
            additionalSpecialForms: truthHelpersAdditionalSpecialForms,
          },
        },
      }).specialForms.imports['ember-truth-helpers'].eq,
    ).toEqual('===');
  });
});
