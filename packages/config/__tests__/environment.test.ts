import { GlintEnvironment } from '../src';

describe('Environments', () => {
  describe('moduleMayHaveTagImports', () => {
    test('locating a single tag', () => {
      let env = new GlintEnvironment({
        tags: {
          'my-cool-environment': { hbs: { typesSource: 'whatever' } },
        },
      });

      expect(env.moduleMayHaveTagImports('import foo from "my-cool-environment"\n')).toBe(true);
    });

    test('locating one of several tags', () => {
      let env = new GlintEnvironment({
        tags: {
          'my-cool-environment': { hbs: { typesSource: 'whatever' } },
          'another-env': { tagMe: { typesSource: 'over-here' } },
          'and-this-one': { hbs: { typesSource: '✨' } },
        },
      });

      expect(env.moduleMayHaveTagImports('import foo from "another-env"\n')).toBe(true);
    });

    test('checking a definitely-unused module', () => {
      let env = new GlintEnvironment({
        tags: {
          'my-cool-environment': { hbs: { typesSource: 'whatever' } },
        },
      });

      expect(env.moduleMayHaveTagImports('import { hbs } from "another-env"\n')).toBe(false);
    });
  });

  describe('getConfiguredTemplateTags', () => {
    test('returns the given tag config', () => {
      let tags = {
        '@glimmerx/component': { hbs: { typesSource: '@glint/environment-glimmerx/types' } },
      };

      let env = new GlintEnvironment({ tags });

      expect(env.getConfiguredTemplateTags()).toBe(tags);
    });
  });
});
