import { GlintEnvironment } from '@glint/config/lib/environment';

describe('Environments: Ember Loose', () => {
  test.each(['ts', 'js'])('finds possible template paths for %s script paths', (ext) => {
    let env = GlintEnvironment.load('ember-loose');

    // colocated script/template pair
    expect(env.getPossibleTemplatePaths(`hello.${ext}`).map(({ path }) => path)).toEqual([
      'hello.hbs',
    ]);

    // pod component
    expect(env.getPossibleTemplatePaths(`/component.${ext}`).map(({ path }) => path)).toEqual([
      '/component.hbs',
      '/template.hbs',
    ]);

    // pod route
    expect(env.getPossibleTemplatePaths(`/route.${ext}`)).toEqual([
      {
        path: '/route.hbs',
        deferTo: [],
      },
      {
        path: '/template.hbs',
        deferTo: ['/controller.ts', '/controller.js'],
      },
    ]);

    // pod controller
    expect(env.getPossibleTemplatePaths(`/controller.${ext}`).map(({ path }) => path)).toEqual([
      '/controller.hbs',
      '/template.hbs',
    ]);

    // classic route
    expect(env.getPossibleTemplatePaths(`/routes/hello.${ext}`)).toEqual([
      {
        path: '/routes/hello.hbs',
        deferTo: [],
      },
      {
        path: '/templates/hello.hbs',
        deferTo: ['/controllers/hello.ts', '/controllers/hello.js'],
      },
    ]);

    // classic controller
    expect(
      env.getPossibleTemplatePaths(`/controllers/hello.${ext}`).map(({ path }) => path)
    ).toEqual(['/controllers/hello.hbs', '/templates/hello.hbs']);

    // classic layout component
    expect(
      env.getPossibleTemplatePaths(`/components/hello.${ext}`).map(({ path }) => path)
    ).toEqual(['/components/hello.hbs', '/templates/components/hello.hbs']);
  });

  test('finds possible script paths for a template', () => {
    let env = GlintEnvironment.load('ember-loose');

    // colocated script/template pair
    expect(env.getPossibleScriptPaths('hello.hbs').map(({ path }) => path)).toEqual([
      'hello.ts',
      'hello.js',
    ]);

    // Pod component/controller/route
    expect(env.getPossibleScriptPaths('/template.hbs').map(({ path }) => path)).toEqual([
      '/template.ts',
      '/template.js',
      '/component.ts',
      '/component.js',
      '/controller.ts',
      '/controller.js',
      '/route.ts',
      '/route.js',
    ]);

    // Classic component
    expect(
      env.getPossibleScriptPaths('/templates/components/hello.hbs').map(({ path }) => path)
    ).toEqual([
      '/templates/components/hello.ts',
      '/templates/components/hello.js',
      '/components/hello.ts',
      '/components/hello.js',
    ]);

    // Classic controller/route
    expect(env.getPossibleScriptPaths('/templates/hello.hbs').map(({ path }) => path)).toEqual([
      '/templates/hello.ts',
      '/templates/hello.js',
      '/controllers/hello.ts',
      '/controllers/hello.js',
      '/routes/hello.ts',
      '/routes/hello.js',
    ]);
  });
});
