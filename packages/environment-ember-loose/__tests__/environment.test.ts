import { describe, test, expect } from 'vitest';
import envDefinition from '../-private/environment/index.js';

describe('Environments: Ember Loose', () => {
  test.each(['ts', 'js'])('finds possible template paths for %s script paths', (ext) => {
    let env = envDefinition({}).template;

    // colocated script/template pair
    expect(env?.getPossibleTemplatePaths(`hello.${ext}`)).toEqual(['hello.hbs']);

    // pod component
    expect(env?.getPossibleTemplatePaths(`/component.${ext}`)).toEqual([
      '/component.hbs',
      '/template.hbs',
    ]);

    // pod route
    expect(env?.getPossibleTemplatePaths(`/route.${ext}`)).toEqual([
      '/route.hbs',
      {
        path: '/template.hbs',
        deferTo: ['/controller.ts', '/controller.js'],
      },
    ]);

    // pod controller
    expect(env?.getPossibleTemplatePaths(`/controller.${ext}`)).toEqual([
      '/controller.hbs',
      '/template.hbs',
    ]);

    // classic route
    expect(env?.getPossibleTemplatePaths(`/routes/hello.${ext}`)).toEqual([
      '/routes/hello.hbs',
      {
        path: '/templates/hello.hbs',
        deferTo: ['/controllers/hello.ts', '/controllers/hello.js'],
      },
    ]);

    // classic controller
    expect(env?.getPossibleTemplatePaths(`/controllers/hello.${ext}`)).toEqual([
      '/controllers/hello.hbs',
      '/templates/hello.hbs',
    ]);

    // classic layout component
    expect(env?.getPossibleTemplatePaths(`/components/hello.${ext}`)).toEqual([
      '/components/hello.hbs',
      '/templates/components/hello.hbs',
    ]);
  });

  test('finds possible script paths for a template', () => {
    let env = envDefinition({}).template;

    // colocated script/template pair
    expect(env?.getPossibleScriptPaths('hello.hbs')).toEqual(['hello.ts', 'hello.js']);

    // Pod component/controller/route
    expect(env?.getPossibleScriptPaths('/template.hbs')).toEqual([
      '/template.ts',
      '/template.js',
      '/component.ts',
      '/component.js',
      '/controller.ts',
      '/controller.js',
      '/route.ts',
      '/route.js',
    ]);

    // Classic controller/route
    expect(env?.getPossibleScriptPaths('/templates/hello.hbs')).toEqual([
      '/templates/hello.ts',
      '/templates/hello.js',
      '/controllers/hello.ts',
      '/controllers/hello.js',
      '/routes/hello.ts',
      '/routes/hello.js',
    ]);
  });
});
